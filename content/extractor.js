// Sentry Issue Data Extractor
// This script extracts issue information from Sentry issue detail pages
// Updated with accurate selectors based on actual Sentry DOM structure

(function() {
  'use strict';

  // Helper function to safely get text content
  function getText(selector, context = document) {
    const element = context.querySelector(selector);
    return element ? element.textContent.trim() : null;
  }

  // Helper function to get attribute value
  function getAttr(selector, attr, context = document) {
    const element = context.querySelector(selector);
    return element ? element.getAttribute(attr) : null;
  }

  // Helper function to get all matching elements' text
  function getAllText(selector, context = document) {
    const elements = context.querySelectorAll(selector);
    return Array.from(elements).map(el => el.textContent.trim());
  }

  // Extract project name from header breadcrumb area
  function extractProjectName() {
    // Primary: aria-description attribute on project link
    const projectLink = document.querySelector('a[aria-description][href*="/insights/projects/"]');
    if (projectLink) {
      const desc = projectLink.getAttribute('aria-description');
      if (desc) return desc;
    }

    // Fallback: project link in breadcrumb
    const projectLinkAlt = document.querySelector('[data-sentry-component="IssueIdBreadcrumb"] a[href*="/projects/"]');
    if (projectLinkAlt) {
      return projectLinkAlt.textContent.trim();
    }

    // Try platform icon title
    const platformIcon = document.querySelector('[data-sentry-component="PlatformList"] img');
    if (platformIcon) {
      const testId = platformIcon.getAttribute('data-test-id');
      if (testId) {
        // Extract platform from data-test-id like "platform-icon-node-express"
        return testId.replace('platform-icon-', '').replace(/-/g, ' ');
      }
    }

    // Try to extract from URL
    const urlMatch = window.location.href.match(/project=(\d+)/);
    if (urlMatch) return `Project ID: ${urlMatch[1]}`;

    return 'Unknown Project';
  }

  // Extract short issue ID (e.g., "HOORAYHR-BACKEND-4FN")
  function extractShortId() {
    // Primary: ShortId component
    const shortIdEl = document.querySelector('[data-sentry-component="ShortId"] .auto-select-text span');
    if (shortIdEl) return shortIdEl.textContent.trim();

    // Fallback: AutoSelectText component
    const autoSelectEl = document.querySelector('[data-sentry-component="AutoSelectText"] span');
    if (autoSelectEl) return autoSelectEl.textContent.trim();

    // Another fallback
    const shortIdCopyable = document.querySelector('[data-sentry-element="ShortIdCopyable"] span');
    if (shortIdCopyable) return shortIdCopyable.textContent.trim();

    return null;
  }

  // Extract issue ID from URL or page
  function extractIssueId() {
    // Try short ID first
    const shortId = extractShortId();
    if (shortId) return shortId;

    // Extract numeric ID from URL
    const urlMatch = window.location.pathname.match(/\/issues\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    return 'Unknown';
  }

  // Extract issue title
  function extractIssueTitle() {
    // Primary: PrimaryTitle element in header
    const primaryTitle = document.querySelector('[data-sentry-element="PrimaryTitle"]');
    if (primaryTitle) return primaryTitle.textContent.trim();

    // Fallback: EventTitle component
    const eventTitle = document.querySelector('[data-sentry-component="EventTitle"]');
    if (eventTitle) return eventTitle.textContent.trim();

    // Fallback: Title component
    const titleEl = document.querySelector('[data-sentry-element="Title"]');
    if (titleEl) return titleEl.textContent.trim();

    // Try page title
    return document.title.split('|')[0].trim() || 'Unknown Issue';
  }

  // Extract error message/culprit from EventMessage component
  function extractErrorMessage() {
    // Primary: EventMessage component
    const eventMsg = document.querySelector('[data-sentry-component="EventMessage"]');
    if (eventMsg) {
      // Try to get the message text, excluding "(No error message)"
      const noMsgEl = eventMsg.querySelector('[data-sentry-element="NoMessage"]');
      if (noMsgEl) return null; // No actual message

      const msgText = eventMsg.textContent.trim();
      if (msgText && !msgText.includes('(No error message)')) return msgText;
    }

    // Fallback: exception value
    const exceptionValue = document.querySelector('[data-test-id="exception-value"]');
    if (exceptionValue) return exceptionValue.textContent.trim();

    return null;
  }

  // Extract event count using Count component's title attribute
  function extractEventCount() {
    // Primary: Count components - first one is events, second is users
    const countElements = document.querySelectorAll('[data-sentry-component="Count"]');
    if (countElements.length > 0) {
      // First Count is events (total)
      const eventsEl = countElements[0];
      const title = eventsEl.getAttribute('title');
      if (title) return title;
      return eventsEl.textContent.trim();
    }

    return 'Unknown';
  }

  // Extract user count
  function extractUserCount() {
    // Count components - second one is users
    const countElements = document.querySelectorAll('[data-sentry-component="Count"]');
    if (countElements.length > 1) {
      const usersEl = countElements[1];
      const title = usersEl.getAttribute('title');
      if (title) return title;
      return usersEl.textContent.trim();
    }

    return '0';
  }

  // Extract stack trace from exception section
  function extractStackTrace() {
    const frames = [];
    const exceptionSection = document.querySelector('section#exception, [data-test-id="exception"]');

    if (!exceptionSection) return null;

    // Get exception type/value - be specific to get only the h5 title
    const exceptionValueEl = exceptionSection.querySelector('[data-test-id="exception-value"] h5');
    const exceptionValue = exceptionValueEl ? exceptionValueEl.textContent.trim() : null;

    // Get all stack frames
    const frameElements = exceptionSection.querySelectorAll('[data-test-id="line"].frame, li.frame');

    frameElements.forEach(frame => {
      // Get filename
      const filename = getText('[data-test-id="filename"], code.filename', frame) || '';

      // Get function name
      const funcName = getText('[data-test-id="function"], [data-sentry-component="FunctionName"]', frame) || '';

      // Get line info from InFramePosition elements
      const lineInfoEl = frame.querySelector('[data-sentry-element="InFramePosition"]');
      let lineNo = '';
      if (lineInfoEl) {
        lineNo = lineInfoEl.textContent.trim();
      }

      // Get context code if expanded
      const contextEl = frame.querySelector('[data-test-id="frame-context"]');
      let context = '';
      if (contextEl) {
        const contextLines = contextEl.querySelectorAll('[data-test-id="context-line"]');
        context = Array.from(contextLines).map(line => line.textContent).join('\n');
      }

      // Check if it's an app frame or system frame
      const isSystem = frame.classList.contains('system-frame');
      const isExpanded = frame.classList.contains('expanded');

      if (filename || funcName) {
        frames.push({
          filename,
          lineNo,
          function: funcName,
          context: context.substring(0, 1000),
          isSystem,
          isExpanded
        });
      }
    });

    // If no frames found, try to get raw stack trace text
    if (frames.length === 0) {
      const stackContent = document.querySelector('[data-test-id="stack-trace-content"]');
      if (stackContent) {
        return { raw: stackContent.textContent.trim().substring(0, 5000), exceptionValue };
      }
    }

    return frames.length > 0 ? { frames, exceptionValue } : null;
  }

  // Extract breadcrumbs from breadcrumbs section
  function extractBreadcrumbs() {
    const breadcrumbs = [];
    const breadcrumbSection = document.querySelector('section#breadcrumbs, [data-test-id="breadcrumbs"]');

    if (!breadcrumbSection) return null;

    // Breadcrumbs are rendered as individual items
    // Look for BreadcrumbLevel, BreadcrumbText, etc.
    const breadcrumbItems = breadcrumbSection.querySelectorAll('[data-sentry-component="Item"]');

    breadcrumbItems.forEach(item => {
      // Get level/type
      const levelEl = item.querySelector('[data-sentry-element="BreadcrumbLevel"]');
      const level = levelEl ? levelEl.textContent.trim() : '';

      // Get text/message
      const textEl = item.querySelector('[data-sentry-element="BreadcrumbText"]');
      const message = textEl ? textEl.textContent.trim() : '';

      // Get category from various crumb content components
      const category = getText('[data-sentry-component="HTTPCrumbContent"]', item) ? 'http' :
                       getText('[data-sentry-component="ExceptionCrumbContent"]', item) ? 'exception' :
                       '';

      // Get timestamp
      const timeEl = item.querySelector('time');
      const timestamp = timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent.trim()) : '';

      if (level || message || category) {
        breadcrumbs.push({ category, type: level, message, timestamp, level });
      }
    });

    // If no items found with that approach, try alternative structure
    if (breadcrumbs.length === 0) {
      // Look for any identifiable breadcrumb patterns
      const allText = breadcrumbSection.textContent;
      if (allText && allText.length > 10) {
        return [{ raw: allText.substring(0, 3000) }];
      }
    }

    return breadcrumbs.length > 0 ? breadcrumbs : null;
  }

  // Extract HTTP request info from request section
  function extractHttpRequest() {
    const requestSection = document.querySelector('section#request, [data-test-id="request"]');

    if (!requestSection) return null;

    const request = {};

    // Extract key-value data from the section
    const data = extractKeyValuePairsFromSection(requestSection);
    if (Object.keys(data).length > 0) {
      Object.assign(request, data);
    }

    // Look for URL in the section
    const urlEl = requestSection.querySelector('a[href], [data-sentry-element="TagLinkText"]');
    if (urlEl) {
      request.url = urlEl.textContent.trim();
    }

    return Object.keys(request).length > 0 ? request : null;
  }

  // Extract tags from tags section
  function extractTags() {
    const tags = {};
    const tagsSection = document.querySelector('section#tags, [data-test-id="tags"]');

    // Helper to extract value from TreeValue element
    function getTagValue(valueEl) {
      if (!valueEl) return '';
      // Try to get from nested span/a elements first (more specific)
      const nestedEl = valueEl.querySelector('span[data-test-id="loaded-device-name"], a, [data-sentry-element="TagLinkText"] a');
      if (nestedEl) return nestedEl.textContent.trim();
      // Fall back to direct text content
      return valueEl.textContent.trim();
    }

    if (!tagsSection) {
      // Try highlight tags
      const highlightTags = document.querySelectorAll('[data-test-id="highlight-tag-row"]');
      highlightTags.forEach(row => {
        const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
        const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
        if (keyEl && valueEl) {
          const key = keyEl.getAttribute('title') || keyEl.textContent.trim();
          const value = getTagValue(valueEl);
          if (key && value) {
            tags[key] = value;
          }
        }
      });
      return Object.keys(tags).length > 0 ? tags : null;
    }

    // Get tags from tree rows
    const tagRows = tagsSection.querySelectorAll('[data-test-id="tag-tree-row"]');
    tagRows.forEach(row => {
      const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
      const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
      if (keyEl && valueEl) {
        const key = keyEl.getAttribute('title') || keyEl.textContent.trim();
        const value = getTagValue(valueEl);
        if (key && value) {
          tags[key] = value;
        }
      }
    });

    // Also get highlight tag rows if present
    const highlightRows = document.querySelectorAll('[data-test-id="highlight-tag-row"]');
    highlightRows.forEach(row => {
      const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
      const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
      if (keyEl && valueEl) {
        const key = keyEl.getAttribute('title') || keyEl.textContent.trim();
        const value = getTagValue(valueEl);
        if (key && value && !tags[key]) {
          tags[key] = value;
        }
      }
    });

    return Object.keys(tags).length > 0 ? tags : null;
  }

  // Extract contexts from contexts section
  function extractContexts() {
    const contexts = {};
    const contextsSection = document.querySelector('section#contexts, [data-test-id="contexts"]');

    if (!contextsSection) {
      return null;
    }

    // Extract from CardPanel cards within contexts
    const contextCards = contextsSection.querySelectorAll('[data-sentry-component="Card"]');
    contextCards.forEach(card => {
      // Get card title from the header structure: .app-1iulv6v > .app-1s5bxg5 > div:first-child
      const headerContainer = card.querySelector('.app-1iulv6v');
      let cardTitle = 'Unknown';
      if (headerContainer) {
        // The title is in the first div inside the container div
        const containerDiv = headerContainer.querySelector('div');
        if (containerDiv) {
          const titleDiv = containerDiv.querySelector('div:first-child');
          if (titleDiv) cardTitle = titleDiv.textContent.trim();
        }
      }

      const cardData = {};

      // Get content wrapper key-value pairs (skip the header which is not a ContentWrapper)
      const contentWrappers = card.querySelectorAll('[data-sentry-component="Content"]');
      contentWrappers.forEach(wrapper => {
        // Key is in the div with class containing 'app-133o408'
        const keyDiv = wrapper.querySelector('.app-133o408, div:first-child');
        // Value wrapper contains the actual value
        const valueWrapper = wrapper.querySelector('[data-sentry-element="ValueWrapper"]');

        if (keyDiv && valueWrapper) {
          const key = keyDiv.textContent.trim();
          // Get value - try specific data-test-id elements first for clean values
          let value = '';
          const valueEl = valueWrapper.querySelector('[data-test-id^="value-"], span.app-1ovumeb');
          if (valueEl) {
            value = valueEl.textContent.trim();
          } else {
            // Get direct text content excluding RelativeTime spans
            const relativeTimeEl = valueWrapper.querySelector('[data-sentry-component="getRelativeTimeFromEventDateCreated"]');
            if (relativeTimeEl) {
              // Clone and remove the relative time span to get clean value
              const clone = valueWrapper.cloneNode(true);
              const relTime = clone.querySelector('[data-sentry-component="getRelativeTimeFromEventDateCreated"]');
              if (relTime) relTime.remove();
              value = clone.textContent.trim();
            } else {
              // Check for link
              const linkEl = valueWrapper.querySelector('a');
              if (linkEl) {
                value = linkEl.textContent.trim();
              } else {
                value = valueWrapper.textContent.trim();
              }
            }
          }

          if (key && value) {
            cardData[key] = value;
          }
        }
      });

      if (Object.keys(cardData).length > 0) {
        contexts[cardTitle] = cardData;
      }
    });

    return Object.keys(contexts).length > 0 ? contexts : null;
  }

  // Extract additional data from extra section - always extract full structured data
  function extractAdditionalData() {
    const extraSection = document.querySelector('section#extra, [data-test-id="extra"]');

    if (!extraSection) return null;

    const data = {};

    // Get the KeyValueList table
    const kvTable = extraSection.querySelector('table.key-value, [data-sentry-component="KeyValueList"]');
    if (kvTable) {
      const rows = kvTable.querySelectorAll('tr');
      rows.forEach(row => {
        const keyCell = row.querySelector('td.key');
        const valCell = row.querySelector('td.val');
        if (keyCell && valCell) {
          const key = keyCell.textContent.trim();
          // Extract the full structured value recursively
          const value = extractStructuredValue(valCell);
          if (key && value !== null && value !== undefined) {
            data[key] = value;
          }
        }
      });
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  // Recursively extract structured data (objects, arrays, primitives)
  function extractStructuredValue(element) {
    if (!element) return null;

    // Check for CollapsibleValue (complex object/array)
    const collapsible = element.querySelector('[data-sentry-component="CollapsibleValue"]');
    if (collapsible) {
      return parseCollapsibleValue(collapsible);
    }

    // Check for simple value types
    const numberEl = element.querySelector('[data-test-id="value-number"]');
    if (numberEl) {
      const num = parseFloat(numberEl.textContent.trim());
      return isNaN(num) ? numberEl.textContent.trim() : num;
    }

    const stringEl = element.querySelector('[data-test-id="value-string"], pre.val-string');
    if (stringEl) return stringEl.textContent.trim();

    const boolEl = element.querySelector('[data-test-id="value-boolean"]');
    if (boolEl) return boolEl.textContent.trim() === 'true';

    const nullEl = element.querySelector('[data-test-id="value-null"]');
    if (nullEl) return null;

    // Fallback to text content
    return element.textContent.trim() || null;
  }

  // Parse a CollapsibleValue component into a JS object/array
  function parseCollapsibleValue(collapsible) {
    // Determine if it's an object or array by looking at the first character
    const firstChar = collapsible.textContent.trim().charAt(0);
    const isArray = firstChar === '[';

    if (isArray) {
      return parseArrayValue(collapsible);
    } else {
      return parseObjectValue(collapsible);
    }
  }

  // Parse object structure from CollapsibleValue
  function parseObjectValue(container) {
    const result = {};

    // Find the inner content div (contains the key-value pairs)
    const contentDiv = container.querySelector('.app-c7pnka, .e1wb8tv11');
    if (!contentDiv) {
      // Try to get a simplified text representation
      return container.textContent.trim();
    }

    // Get direct child divs (each represents a key-value pair)
    const childDivs = contentDiv.children;

    for (const child of childDivs) {
      // Get the key
      const keyEl = child.querySelector('[data-sentry-element="ValueObjectKey"]');
      if (!keyEl) continue;

      const key = keyEl.textContent.trim();

      // Check if this key has a nested CollapsibleValue (nested object/array)
      const nestedCollapsible = child.querySelector('[data-sentry-component="CollapsibleValue"]');
      if (nestedCollapsible && nestedCollapsible !== container) {
        result[key] = parseCollapsibleValue(nestedCollapsible);
      } else {
        // Simple value - look for value elements after the key
        const valueEl = child.querySelector('[data-test-id^="value-"]');
        if (valueEl) {
          const testId = valueEl.getAttribute('data-test-id');
          if (testId === 'value-number') {
            const num = parseFloat(valueEl.textContent.trim());
            result[key] = isNaN(num) ? valueEl.textContent.trim() : num;
          } else if (testId === 'value-boolean') {
            result[key] = valueEl.textContent.trim() === 'true';
          } else if (testId === 'value-null') {
            result[key] = null;
          } else {
            result[key] = valueEl.textContent.trim();
          }
        }
      }
    }

    return Object.keys(result).length > 0 ? result : container.textContent.trim();
  }

  // Parse array structure from CollapsibleValue
  function parseArrayValue(container) {
    const result = [];

    const contentDiv = container.querySelector('.app-c7pnka, .e1wb8tv11');
    if (!contentDiv) {
      return container.textContent.trim();
    }

    const childDivs = contentDiv.children;

    for (const child of childDivs) {
      // Check for nested CollapsibleValue
      const nestedCollapsible = child.querySelector('[data-sentry-component="CollapsibleValue"]');
      if (nestedCollapsible) {
        result.push(parseCollapsibleValue(nestedCollapsible));
      } else {
        // Simple value
        const valueEl = child.querySelector('[data-test-id^="value-"]');
        if (valueEl) {
          const testId = valueEl.getAttribute('data-test-id');
          if (testId === 'value-number') {
            const num = parseFloat(valueEl.textContent.trim());
            result.push(isNaN(num) ? valueEl.textContent.trim() : num);
          } else if (testId === 'value-boolean') {
            result.push(valueEl.textContent.trim() === 'true');
          } else if (testId === 'value-null') {
            result.push(null);
          } else {
            result.push(valueEl.textContent.trim());
          }
        }
      }
    }

    return result.length > 0 ? result : container.textContent.trim();
  }

  // Helper to extract key-value pairs from a FoldSection (used for HTTP request, etc.)
  function extractKeyValuePairsFromSection(section) {
    const data = {};

    // Method 1: KeyValueList table
    const kvTable = section.querySelector('table.key-value, [data-sentry-component="KeyValueList"]');
    if (kvTable) {
      const rows = kvTable.querySelectorAll('tr');
      rows.forEach(row => {
        const keyCell = row.querySelector('td.key');
        const valCell = row.querySelector('td.val');
        if (keyCell && valCell) {
          const key = keyCell.textContent.trim();
          const value = extractStructuredValue(valCell);
          if (key && value !== null && value !== undefined) {
            // Convert objects to JSON string for simpler sections like HTTP request
            data[key] = typeof value === 'object' ? JSON.stringify(value) : value;
          }
        }
      });
      if (Object.keys(data).length > 0) return data;
    }

    // Method 2: CardPanel structure (used in Contexts section)
    const cards = section.querySelectorAll('[data-sentry-component="Card"]');
    cards.forEach(card => {
      // Get card title
      const titleEl = card.querySelector('[data-sentry-component="Content"] > div:first-child');
      let cardTitle = '';
      if (titleEl) {
        // The title div structure has the name as first child div
        const titleDiv = card.querySelector('.app-1iulv6v > div:first-child > div:first-child');
        if (titleDiv) cardTitle = titleDiv.textContent.trim();
      }

      // Get content wrapper key-value pairs
      const contentWrappers = card.querySelectorAll('[data-sentry-component="Content"]');
      contentWrappers.forEach(wrapper => {
        // Key is in the first div (class contains app-133o408)
        const keyEl = wrapper.querySelector('div:first-child');
        // Value is in ValueWrapper or ValueSection
        const valueEl = wrapper.querySelector('[data-test-id^="value-"], span[data-test-id], pre[data-test-id]');

        if (keyEl && valueEl) {
          const key = keyEl.textContent.trim();
          const value = valueEl.textContent.trim();
          if (key && value && key !== cardTitle) {
            const fullKey = cardTitle ? `${cardTitle} - ${key}` : key;
            data[fullKey] = value;
          }
        }
      });
    });

    // Method 3: Tree structure (TreeKey/TreeValue) - for tags
    const treeRows = section.querySelectorAll('[data-test-id="tag-tree-row"]');
    treeRows.forEach(row => {
      const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
      const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
      if (keyEl && valueEl) {
        const key = keyEl.getAttribute('title') || keyEl.textContent.trim();
        // Get the actual value text from nested spans
        const valueSpan = valueEl.querySelector('span[data-test-id], a');
        const value = valueSpan ? valueSpan.textContent.trim() : valueEl.textContent.trim();
        if (key && value) {
          data[key] = value;
        }
      }
    });

    // Method 4: dl/dt/dd
    const dts = section.querySelectorAll('dt');
    dts.forEach(dt => {
      const dd = dt.nextElementSibling;
      if (dd && dd.tagName === 'DD') {
        data[dt.textContent.trim()] = dd.textContent.trim();
      }
    });

    return data;
  }


  // Extract URL/route from header or tags
  function extractRoute() {
    // Try to get transaction from header status area
    const headerGrid = document.querySelector('[data-sentry-element="HeaderGrid"]');
    if (headerGrid) {
      // Look for transaction info (e.g., "GET /time-off-calendar")
      const spans = headerGrid.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (text.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\//)) {
          return text;
        }
      }
    }

    // Try tags for URL
    const tags = extractTags();
    if (tags) {
      if (tags['transaction']) return tags['transaction'];
      if (tags['url']) return tags['url'];
    }

    // Look for URL in highlight tags
    const highlightRows = document.querySelectorAll('[data-test-id="highlight-tag-row"]');
    for (const row of highlightRows) {
      const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
      if (keyEl) {
        const key = keyEl.getAttribute('title') || keyEl.textContent.trim();
        if (key === 'url' || key === 'transaction') {
          const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
          if (valueEl) return valueEl.textContent.trim();
        }
      }
    }

    return null;
  }

  // Extract first seen / last seen timestamps
  function extractTimestamps() {
    const timestamps = {};

    const firstSeen = getText('[data-test-id="first-seen"], .first-seen');
    const lastSeen = getText('[data-test-id="last-seen"], .last-seen');

    if (firstSeen) timestamps.firstSeen = firstSeen;
    if (lastSeen) timestamps.lastSeen = lastSeen;

    // Try to find in stats section
    const statsItems = document.querySelectorAll('[data-test-id="stats-item"], .stats-item');
    statsItems.forEach(item => {
      const label = getText('.label, dt', item);
      const value = getText('.value, dd, time', item);
      if (label && value) {
        if (label.toLowerCase().includes('first')) timestamps.firstSeen = value;
        if (label.toLowerCase().includes('last')) timestamps.lastSeen = value;
      }
    });

    return Object.keys(timestamps).length > 0 ? timestamps : null;
  }

  // Extract environment
  function extractEnvironment() {
    const tags = extractTags();
    if (tags && tags['environment']) {
      return tags['environment'];
    }

    const envEl = document.querySelector('[data-test-id="environment"], .environment-tag');
    if (envEl) {
      return envEl.textContent.trim();
    }

    return null;
  }

  // Extract release/version
  function extractRelease() {
    const tags = extractTags();
    if (tags && tags['release']) {
      return tags['release'];
    }

    const releaseEl = document.querySelector('[data-test-id="release"], .release-tag');
    if (releaseEl) {
      return releaseEl.textContent.trim();
    }

    return null;
  }

  // Extract user info
  function extractUserInfo() {
    const userSection = document.querySelector('[data-test-id="user-context"], [data-test-id="user"], .user-info');

    if (userSection) {
      return extractKeyValuePairsFromSection(userSection);
    }

    // Try contexts
    const contexts = extractContexts();
    if (contexts && contexts['User']) {
      return contexts['User'];
    }

    return null;
  }

  // Extract priority from header
  function extractPriority() {
    // Look for priority Tag component
    const priorityTag = document.querySelector('[aria-label="Modify issue priority"] [data-sentry-component="Tag"]');
    if (priorityTag) {
      // The priority might be in a VisuallyHidden div
      const hiddenText = priorityTag.querySelector('[data-sentry-element="VisuallyHidden"]');
      if (hiddenText) return hiddenText.textContent.trim();
      // Or just get the text
      return priorityTag.textContent.replace(/[↓↑]/g, '').trim();
    }
    return null;
  }

  // Extract issue status
  function extractStatus() {
    // Look for status span in header
    const statusSpans = document.querySelectorAll('[data-sentry-element="HeaderGrid"] span');
    for (const span of statusSpans) {
      const text = span.textContent.trim().toLowerCase();
      if (['ongoing', 'resolved', 'ignored', 'archived', 'unresolved'].includes(text)) {
        return span.textContent.trim();
      }
    }
    return null;
  }

  // Extract level (error, warning, info, etc.)
  function extractLevel() {
    // From tags
    const tags = extractTags();
    if (tags && tags['level']) {
      return tags['level'];
    }

    // From ColoredLine with aria-describedby showing level
    const levelIndicator = document.querySelector('[data-sentry-element="ColoredLine"]');
    if (levelIndicator) {
      const hiddenText = levelIndicator.querySelector('[data-sentry-element="VisuallyHidden"]');
      if (hiddenText) {
        const text = hiddenText.textContent.trim();
        const match = text.match(/Level:\s*(\w+)/i);
        if (match) return match[1];
      }
    }

    return null;
  }

  // Main extraction function
  function extractAllData() {
    const data = {
      url: window.location.href,
      projectName: extractProjectName(),
      issueId: extractIssueId(),
      shortId: extractShortId(),
      title: extractIssueTitle(),
      errorMessage: extractErrorMessage(),
      route: extractRoute(),
      eventCount: extractEventCount(),
      userCount: extractUserCount(),
      environment: extractEnvironment(),
      release: extractRelease(),
      priority: extractPriority(),
      status: extractStatus(),
      level: extractLevel(),
      timestamps: extractTimestamps(),
      userInfo: extractUserInfo(),
      stackTrace: extractStackTrace(),
      breadcrumbs: extractBreadcrumbs(),
      httpRequest: extractHttpRequest(),
      tags: extractTags(),
      contexts: extractContexts(),
      additionalData: extractAdditionalData()
    };

    return data;
  }

  // Expose extraction function globally for popup to call
  window.sentryExtractor = {
    extract: extractAllData
  };

  // Handle messages from popup/background - unified handler
  const browserAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser :
                     (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : null;

  if (browserAPI && browserAPI.runtime) {
    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Ping handler for checking if content script is loaded
      if (request.action === 'ping') {
        sendResponse({ pong: true });
        return true;
      }

      // Extract data handler
      if (request.action === 'extractData') {
        const data = extractAllData();
        sendResponse({ success: true, data });
        return true;
      }

      return true;
    });
  }
})();