const ICON_DELAY = 5000; // Delay before icon goes back to normal
const setIcon = path => path ? chrome.browserAction.setIcon({path}) : chrome.browserAction.setIcon({path: '/images/icon.png'});

// Called when the user clicks on the browser action.
chrome.browserAction.onClicked.addListener(function(tab) {
    // Send a message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    });
});

// Message passed from Content script
chrome.runtime.onMessage.addListener(function(request,sender,sendResponse) {
    if (request.showIcon) {
        let iconName = request['showIcon'] === true ? "icon_yes" : "icon_no";
        let path = `/images/${iconName}.png`;

        // Update Icons
        setIcon(path);
        setTimeout(setIcon, ICON_DELAY);

        sendResponse(request);
    }

    if (request.showCartPopup) {
        chrome.tabs.create({ url: request.showCartPopup });
    }
});

// Handle Click for Extension Icon
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let activeTab = tabs[0];

        chrome.tabs.sendMessage(activeTab.id, {syncCart: true}, function(response) {
            console.log("syncCart response:", response);
        });
    });
});

// Set starting icon
setIcon();


