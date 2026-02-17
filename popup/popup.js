// Popup script for Sentry to Jira extension

(function() {
  'use strict';

  // Browser API compatibility
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  // DOM Elements
  const extractBtn = document.getElementById('extract-btn');
  const statusMessage = document.getElementById('status-message');
  const notSentryMessage = document.getElementById('not-sentry');
  const mainContent = document.getElementById('main-content');

  // Check if current tab is a Sentry issue page
  async function checkIfSentryPage() {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      const url = tab.url || '';
      
      const isSentryIssue = url.includes('sentry.io') && 
        (url.includes('/issues/') || url.includes('/issues?'));
      
      if (!isSentryIssue) {
        notSentryMessage.classList.remove('hidden');
        mainContent.classList.add('hidden');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking tab:', error);
      return false;
    }
  }

  // Show status message
  function showStatus(message, isSuccess = true) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isSuccess ? 'success' : 'error'}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 3000);
  }

  // Inject content scripts if not already injected
  async function ensureContentScriptsLoaded(tabId) {
    try {
      // Try to ping the content script
      const response = await browserAPI.tabs.sendMessage(tabId, { action: 'ping' });
      if (response && response.pong) {
        return true;
      }
    } catch (e) {
      // Content script not loaded, inject it
      try {
        await browserAPI.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/extractor.js', 'content/formatter.js']
        });
        // Wait a bit for scripts to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      } catch (err) {
        console.error('Failed to inject content scripts:', err);
        return false;
      }
    }
    return true;
  }

  // Extract and copy data
  async function extractAndCopy() {
    extractBtn.disabled = true;
    extractBtn.classList.add('loading');
    
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      
      // Ensure content scripts are loaded
      await ensureContentScriptsLoaded(tab.id);
      
      // Send message to content script to extract and copy
      const response = await browserAPI.tabs.sendMessage(tab.id, { 
        action: 'extractAndCopy',
        options: getOptions()
      });
      
      if (response && response.success) {
        showStatus('✓ Copied to clipboard!', true);
      } else {
        showStatus('Failed to extract data: ' + (response?.error || 'Unknown error'), false);
      }
    } catch (error) {
      console.error('Extract error:', error);
      showStatus('Error: ' + error.message, false);
    } finally {
      extractBtn.disabled = false;
      extractBtn.classList.remove('loading');
    }
  }

  // Get options from checkboxes
  function getOptions() {
    return {
      includeBreadcrumbs: document.getElementById('include-breadcrumbs').checked,
      includeContexts: document.getElementById('include-contexts').checked,
      includeTags: document.getElementById('include-tags').checked
    };
  }

  // Initialize popup
  async function init() {
    const isSentryPage = await checkIfSentryPage();
    
    if (isSentryPage) {
      extractBtn.addEventListener('click', extractAndCopy);
    }
  }

  // Run on popup open
  init();
})();

