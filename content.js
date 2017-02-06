const DEVELOPER_MODE = true,
      EVENT_DELAY_TIME = 3000, // in MS
      INITIAL_SYNC_DELAY_TIME = 2000; // in MS

// DB Config START
const firebaseConfig = {
    apiKey: "AIzaSyCaqmaIFD9ggIa_Udkk3ThYez3WFMJpFvA",
    authDomain: "share-my-items.firebaseapp.com",
    databaseURL: "https://share-my-cart.firebaseio.com",
    storageBucket: "share-my-items.appspot.com",
    messagingSenderId: "572698823749"
};
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
// DB Config END

const options = {
    autoSync: false,
    userName: false
};

let items = {};

const addCartToDatabase = () => {
    if (options.userName) {
        return database.ref('/carts/' + options.userName + '/items').set(items);
    }
    else {
        // No user configured so add a new record to Carts.
        // Grabs the ID of the newly created record as response to give to user.
        database.ref('/carts').push({
            items: items,
            updatedAt: Date.now()
        }).then(response => {
            const popupUrl = `https://share-my-cart.firebaseapp.com/cart/${response.key}`;

            // Send confirmation popup message to background script
            chrome.runtime.sendMessage({showCartPopup: popupUrl});
        }).catch(err => console.error("Error saving to the database."));
    }
};

const clearCartInDatabase = () => {
    if (options.userName) {
        return database.ref('/carts/' + options.userName + '/items').set({});
    }
};

const scrapeAmazonForCartItems = () => {
    try {
        items = {}; // Reset cart items
        //debugger;

        for (let element of document.querySelector('.sc-list-body').children) {
            if (element.tagName !== "DIV") continue;

            console.log("Element from amazon scrape:", element);
            const title = $(element).find('.sc-product-title')[0].innerText, titleKey = title.hashCode();

            if ($(element).data('removed')) {
                console.warn(title + " has been removed from cart");
            }
            else {
                items[titleKey] = {
                    title: title,
                    link: $(element).find('.sc-product-link')[0].href,
                    qty: parseInt($(element).find('.a-dropdown-prompt')[0].innerText.replace(/[^0-9]/, '')),
                    price: parseFloat($(element).find('.sc-product-price')[0].innerText.replace(/[^0-9]|^./,'')),
                    image: $(element).find('.sc-product-image').attr('src').replace(/\._.*/, '') // Get rid of the ending dimensions, so they can be added back client side
                }
            }
        }
    } catch(e) {
        console.warn("Error scraping cart items:", e);
        chrome.runtime.sendMessage({showIcon: false});
    }

};

const addItems = () => {
    console.log("Add Items runnign");
    scrapeAmazonForCartItems();

    if (Object.keys(items).length >= 1) {
        addCartToDatabase();
        chrome.runtime.sendMessage({showIcon: true});
    }
    else {
        clearCartInDatabase();
        chrome.runtime.sendMessage({showIcon: false});
    }

    if (DEVELOPER_MODE) { logResults(); }
};

const logResults = () => {
    let resultStr = "", idx = 0, subtotal, grandTotal = 0;

    for (let key in items) {
        let item = items[key];
        grandTotal += subTotal = item.qty * item.price;
        resultStr += `${++idx}) ${item.title}\nPrice: ${item.qty} @ $${item.price} = $${subTotal}\nLink: ${item.link}\n\n`;
    }

    console.log("------------------------------------");
    console.log("|       Amazon Cart Contents       |");
    console.log("------------------------------------");
    console.log(resultStr.slice(0, -2));
    console.log("------------------------------------");
    console.log(`Total: ${grandTotal}`);
    console.log("------------------------------------");
};

const init = () => {
    // Check for & set Username and Auto Sync
    chrome.storage.sync.get({userName: false, autoSync: false}, ({userName, autoSync}) => {
        options.userName = userName;
        options.autoSync = autoSync;
        debugger;

        // Auto Sync
        if (options.autoSync) {
            setTimeout(addItems, INITIAL_SYNC_DELAY_TIME);
            const debounced = _.debounce(addItems, EVENT_DELAY_TIME);
            window.addEventListener("keypress", debounced, false);
            window.addEventListener("click", debounced, false);
        }
    });

    // Handle Click for Extension Icon
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.syncCart) {
            addItems();
        }
    });
};

init();

/*
    HELPER METHODS
 */

// Helper to generate hash on title of item
String.prototype.hashCode = function() {
    let hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
