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

function moveFbRecord(oldRef, newRef, callback) {
    oldRef.once('value', function (snap) {
        newRef.set(snap.val(), function (error) {
            if (!error) {
                oldRef.remove();
                callback();
            }
            else if (typeof(console) !== 'undefined' && console.error) {
                console.error(error);
            }
        });
    });
}
// DB Config END

// CSS Background hack since not supported natively with Chrome extensions
const imgURL = chrome.extension.getURL("images/options_background.jpg");
document.body.style.backgroundImage = `url(${imgURL})`;

const showUserName = userName => {
    if (userName) {
        const link = 'https://share-my-cart.firebaseapp.com/cart/' + userName;
        document.getElementById('current-username').innerHTML = `<a href='${link}'>${userName}</a>`;
        document.getElementById('save').innerText = 'Update';
    }
    else {
        document.getElementById('current-username').innerText = 'NOT SET';
        document.getElementById('save').innerText = 'Set';
    }
};

const setAutoSync = (autoSync) => {
    document.getElementById('auto-sync-checkbox').checked = autoSync;
};

function save_username() {
    console.log("save username called");
    let newUserName = document.getElementById('username').value;

    chrome.storage.sync.get({userName: false}, ({userName}) => {
        let oldUserName = userName;

        database.ref('/carts/' + newUserName).once('value', snapshot => {
            if (snapshot.exists()) {
                alert("User already exists, try another username.");
            }
            else {
                if (oldUserName) {
                    moveFbRecord(database.ref('/carts/' + oldUserName),
                        database.ref('/carts/' + newUserName),
                        () => chrome.storage.sync.set({userName}, () => showUserName(userName)));
                }
                else {
                    chrome.storage.sync.set({userName: newUserName}, () => showUserName(newUserName));
                }
            }
        });
    });
}

document.getElementById('save').addEventListener('click', save_username);

document.getElementById('auto-sync-checkbox').addEventListener('click', () => {
    chrome.storage.sync.get({userName: false}, ({userName}) => {
        if (!userName) {
            chrome.storage.sync.set({autoSync: false}, () => document.getElementById('auto-sync-checkbox').checked = false);
            alert("Must have a Custom Cart link set up to use Auto Sync!");
        }
        else {
            let autoSync = document.getElementById('auto-sync-checkbox').checked;
            chrome.storage.sync.set({autoSync}, () => console.log("autoSync set"));
        }
    });
});

document.getElementById('delete-custom-cart').addEventListener('click', () => {
    chrome.storage.sync.get({userName: false, autoSync: false}, ({userName}) => {
        if (userName) {
            moveFbRecord(database.ref('/carts/' + userName), database.ref('/carts/deleted'), () => {
                chrome.storage.sync.set({userName: false, autoSync: false}, () => {
                    console.warn("Username Cleared!");
                    showUserName();
                    document.getElementById('auto-sync-checkbox').checked = false;
                });
            });
        }
        else {
            alert("Can't delete a user that is not set!");
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({userName: false, autoSync: false}, ({userName, autoSync}) => {
        showUserName(userName);
        setAutoSync(autoSync);
    });
});
