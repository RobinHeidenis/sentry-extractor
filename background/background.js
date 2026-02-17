// Background service worker for Sentry to Jira extension

(function() {
  'use strict';

  // Browser API compatibility
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  // Handle extension installation
  browserAPI.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Sentry to Jira extension installed');
    } else if (details.reason === 'update') {
      console.log('Sentry to Jira extension updated');
    }
  });

  // Handle messages from content scripts or popup
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle ping to check if extension is alive
    if (request.action === 'ping') {
      sendResponse({ pong: true });
      return true;
    }

    // Handle clipboard write request (fallback for some browsers)
    if (request.action === 'copyToClipboard') {
      navigator.clipboard.writeText(request.text)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    return false;
  });

  // Enable action only on Sentry pages
  browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      const isSentryIssue = tab.url.includes('sentry.io') && 
        (tab.url.includes('/issues/') || tab.url.includes('/issues?'));
      
      if (isSentryIssue) {
        // Enable the extension icon
        browserAPI.action.setIcon({
          tabId: tabId,
          path: {
            16: 'icons/icon16.png',
            32: 'icons/icon32.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png'
          }
        });
      }
    }
  });
})();

