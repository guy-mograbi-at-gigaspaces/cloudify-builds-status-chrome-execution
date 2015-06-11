'use strict';

console.log = function(msg){
    chrome.runtime.sendMessage({log: msg});
};

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.setBadgeText({text: '\'Bar'});

console.log('\'Allo \'Allo! Event Page for Browser Action');



setInterval(function(){
    console.log('hello world from backgorund');
},1000);