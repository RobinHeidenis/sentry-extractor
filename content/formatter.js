// Jira Cloud Markdown Formatter for Sentry Data
// Uses standard markdown syntax that works in Jira Cloud's new editor

(function() {
  'use strict';

  // Format a key-value pair as a bullet point with bold key
  function formatKeyValue(key, value) {
    if (value === null || value === undefined) return '';
    return `- **${key}:** ${value}`;
  }

  // Format an object as a bullet list (tables don't paste well in Jira Cloud)
  function formatAsList(obj) {
    if (!obj || Object.keys(obj).length === 0) return '';

    let list = '';
    for (const [key, value] of Object.entries(obj)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      list += `- **${key}:** ${displayValue}\n`;
    }
    return list;
  }

  // Format tags with nesting by prefix (e.g., runtime.name nests under runtime)
  function formatTagsNested(tags) {
    if (!tags || Object.keys(tags).length === 0) return '';

    // Group dotted tags by prefix
    const grouped = {};
    const standalone = {};

    for (const [key, value] of Object.entries(tags)) {
      if (key.includes('.')) {
        const [prefix, ...rest] = key.split('.');
        const subKey = rest.join('.');
        if (!grouped[prefix]) grouped[prefix] = {};
        grouped[prefix][subKey] = value;
      } else {
        standalone[key] = value;
      }
    }

    let output = '';

    // Output tags - if a standalone tag has nested children, combine them
    const outputtedPrefixes = new Set();

    for (const [key, value] of Object.entries(standalone)) {
      if (grouped[key]) {
        // This standalone tag has nested children - output together
        output += `- **${key}:** ${value}\n`;
        for (const [subKey, subValue] of Object.entries(grouped[key])) {
          output += `  - ${subKey}: ${subValue}\n`;
        }
        outputtedPrefixes.add(key);
      } else {
        // Just a standalone tag with no children
        output += `- **${key}:** ${value}\n`;
      }
    }

    // Output any grouped tags that didn't have a standalone parent
    for (const [prefix, subTags] of Object.entries(grouped)) {
      if (!outputtedPrefixes.has(prefix)) {
        output += `- **${prefix}:**\n`;
        for (const [subKey, value] of Object.entries(subTags)) {
          output += `  - ${subKey}: ${value}\n`;
        }
      }
    }

    return output;
  }

  // Format additional data as a code block (always JSON for complex objects)
  function formatAdditionalData(data) {
    if (!data || Object.keys(data).length === 0) return '';

    // Format as pretty JSON in a code block
    try {
      return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
    } catch (e) {
      // Fallback to simple list if JSON fails
      return formatAsList(data);
    }
  }

  // Format stack trace
  function formatStackTrace(stackTrace) {
    if (!stackTrace) return '';

    let output = '';

    // Add exception value if available
    if (stackTrace.exceptionValue) {
      output += `**Exception:** ${stackTrace.exceptionValue}\n\n`;
    }

    if (stackTrace.raw) {
      output += '```\n' + stackTrace.raw + '\n```';
    } else if (stackTrace.frames && stackTrace.frames.length > 0) {
      output += '```\n';
      stackTrace.frames.forEach((frame, index) => {
        const location = frame.filename ? `${frame.filename}${frame.lineNo ? ':' + frame.lineNo : ''}` : 'unknown';
        const func = frame.function || '<anonymous>';
        const marker = frame.isSystem ? '  ' : '→ '; // Highlight app frames
        output += `${marker}${index + 1}. ${func} at ${location}\n`;
        if (frame.context) {
          output += `      ${frame.context.substring(0, 200)}\n`;
        }
      });
      output += '```';
    }

    return output;
  }

  // Format breadcrumbs as a list
  function formatBreadcrumbs(breadcrumbs) {
    if (!breadcrumbs || breadcrumbs.length === 0) return '';

    // Handle raw breadcrumb text
    if (breadcrumbs.length === 1 && breadcrumbs[0].raw) {
      return '```\n' + breadcrumbs[0].raw + '\n```';
    }

    let output = '';

    // Show last 15 breadcrumbs (most recent)
    const recentBreadcrumbs = breadcrumbs.slice(-15);

    recentBreadcrumbs.forEach(bc => {
      const time = bc.timestamp || '';
      const category = bc.category || '';
      const level = bc.type || bc.level || '';
      const message = bc.message ? bc.message.substring(0, 100) : '';
      output += `- ${time ? `[${time}]` : ''} ${category ? `**${category}**` : ''} ${level ? `(${level})` : ''} ${message}\n`;
    });

    return output;
  }

  // Format contexts
  function formatContexts(contexts) {
    if (!contexts || Object.keys(contexts).length === 0) return '';

    let output = '';

    for (const [contextName, contextData] of Object.entries(contexts)) {
      if (typeof contextData === 'object' && Object.keys(contextData).length > 0) {
        output += `\n**${contextName}:**\n`;
        output += formatAsList(contextData);
      }
    }

    return output;
  }

  // Main formatting function - uses Jira Cloud compatible markdown
  function formatToJiraMarkdown(data, options = {}) {
    // Default options
    const opts = {
      includeBreadcrumbs: options.includeBreadcrumbs !== false,
      includeContexts: options.includeContexts !== false,
      includeTags: options.includeTags !== false,
      ...options
    };

    const lines = [];

    // Header with issue title and short ID
    const headerTitle = data.shortId ? `${data.shortId}: ${data.title}` : data.title;
    lines.push(`## ${headerTitle}`);
    lines.push('');

    // Sentry Link (markdown link format)
    lines.push(`[View in Sentry](${data.url})`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Issue Overview section
    lines.push('### Issue Overview');
    lines.push('');

    if (data.projectName) lines.push(formatKeyValue('Project', data.projectName));
    if (data.shortId) lines.push(formatKeyValue('Issue ID', data.shortId));
    else if (data.issueId) lines.push(formatKeyValue('Issue ID', data.issueId));
    if (data.status) lines.push(formatKeyValue('Status', data.status));
    if (data.priority) lines.push(formatKeyValue('Priority', data.priority));
    if (data.level) lines.push(formatKeyValue('Level', data.level));
    if (data.environment) lines.push(formatKeyValue('Environment', data.environment));
    if (data.release) lines.push(formatKeyValue('Release', data.release));
    if (data.eventCount) lines.push(formatKeyValue('Events', data.eventCount));
    if (data.userCount) lines.push(formatKeyValue('Users Affected', data.userCount));
    if (data.route) lines.push(formatKeyValue('Route/URL', data.route));

    if (data.timestamps) {
      if (data.timestamps.firstSeen) lines.push(formatKeyValue('First Seen', data.timestamps.firstSeen));
      if (data.timestamps.lastSeen) lines.push(formatKeyValue('Last Seen', data.timestamps.lastSeen));
    }

    lines.push('');

    // Error Message
    if (data.errorMessage) {
      lines.push('### Error Message');
      lines.push('');
      lines.push('```');
      lines.push(data.errorMessage);
      lines.push('```');
      lines.push('');
    }

    // Stack Trace
    if (data.stackTrace) {
      lines.push('### Stack Trace');
      lines.push('');
      lines.push(formatStackTrace(data.stackTrace));
      lines.push('');
    }

    // Breadcrumbs
    if (opts.includeBreadcrumbs && data.breadcrumbs && data.breadcrumbs.length > 0) {
      lines.push(`### Breadcrumbs (${data.breadcrumbs.length} entries)`);
      lines.push('');
      lines.push(formatBreadcrumbs(data.breadcrumbs));
      lines.push('');
    }

    // HTTP Request
    if (data.httpRequest && Object.keys(data.httpRequest).length > 0) {
      lines.push('### HTTP Request');
      lines.push('');
      lines.push(formatAsList(data.httpRequest));
      lines.push('');
    }

    // User Info
    if (data.userInfo && Object.keys(data.userInfo).length > 0) {
      lines.push('### User Information');
      lines.push('');
      lines.push(formatAsList(data.userInfo));
      lines.push('');
    }

    // Tags (nested by prefix)
    if (opts.includeTags && data.tags && Object.keys(data.tags).length > 0) {
      lines.push('### Tags');
      lines.push('');
      lines.push(formatTagsNested(data.tags));
      lines.push('');
    }

    // Contexts
    if (opts.includeContexts && data.contexts && Object.keys(data.contexts).length > 0) {
      lines.push('### Contexts');
      lines.push('');
      lines.push(formatContexts(data.contexts));
      lines.push('');
    }

    // Additional Data (as code block with full JSON)
    if (data.additionalData && Object.keys(data.additionalData).length > 0) {
      lines.push('### Additional Data');
      lines.push('');
      lines.push(formatAdditionalData(data.additionalData));
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Extracted from Sentry on ${new Date().toISOString().split('T')[0]}*`);

    return lines.join('\n');
  }

  // Copy text to clipboard
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (err2) {
        textArea.remove();
        return false;
      }
    }
  }

  // Show success/error alert
  function showNotification(message, isSuccess = true) {
    // Remove any existing notification
    const existing = document.getElementById('sentry-extract-notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'sentry-extract-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.3s ease, transform 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      ${isSuccess
        ? 'background: #10B981; color: white;'
        : 'background: #EF4444; color: white;'}
    `;

    const icon = isSuccess ? '✓' : '✕';
    notification.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;

    document.body.appendChild(notification);

    // Animate in
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100px)';
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Main function to extract, format, and copy
  async function extractAndCopy(options = {}) {
    try {
      // Get extracted data
      const data = window.sentryExtractor.extract();

      // Format to Jira markdown with options
      const jiraMarkdown = formatToJiraMarkdown(data, options);

      // Copy to clipboard
      const success = await copyToClipboard(jiraMarkdown);

      if (success) {
        showNotification('Sentry issue copied to clipboard as Jira markdown!', true);
      } else {
        showNotification('Failed to copy to clipboard', false);
      }

      return { success, data, markdown: jiraMarkdown };
    } catch (error) {
      console.error('Sentry Extractor Error:', error);
      showNotification('Error extracting Sentry data: ' + error.message, false);
      return { success: false, error: error.message };
    }
  }

  // Expose functions globally
  window.sentryFormatter = {
    format: formatToJiraMarkdown,
    copy: copyToClipboard,
    extractAndCopy: extractAndCopy,
    notify: showNotification
  };

  // Listen for messages from popup
  const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser :
                     (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : null;

  if (browserAPI && browserAPI.runtime) {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Ping handler
      if (request.action === 'ping') {
        sendResponse({ pong: true });
        return true;
      }

      if (request.action === 'extractAndCopy') {
        extractAndCopy(request.options).then(result => {
          sendResponse(result);
        });
        return true; // Keep channel open for async response
      }

      if (request.action === 'getFormattedData') {
        try {
          const data = window.sentryExtractor.extract();
          const markdown = formatToJiraMarkdown(data, request.options);
          sendResponse({ success: true, data, markdown });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        return true;
      }

      return true;
    });
  }
})();

