/**
 * Tags Extractor
 * Extracts tags from the tags section with caching support
 */

import { getTagValue } from "./dom-helpers";

// Cache for tags to avoid redundant DOM queries
let tagsCache: Record<string, string> | null = null;
let tagsCacheValid = false;

/**
 * Clear the tags cache (call when page changes)
 */
export function clearTagsCache(): void {
  tagsCache = null;
  tagsCacheValid = false;
}

/**
 * Extract tags from tags section (cached)
 */
export function extractTags(): Record<string, string> | null {
  // Return cached result if valid
  if (tagsCacheValid) {
    return tagsCache;
  }

  const tags: Record<string, string> = {};
  const tagsSection = document.querySelector(
    'section#tags, [data-test-id="tags"]',
  );

  if (!tagsSection) {
    // Fallback: Try highlight tags
    const highlightTags = document.querySelectorAll(
      '[data-test-id="highlight-tag-row"]',
    );
    for (const row of highlightTags) {
      const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
      const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
      if (keyEl && valueEl) {
        const key =
          keyEl.getAttribute("title") || keyEl.textContent?.trim() || "";
        const value = getTagValue(valueEl);
        if (key && value) {
          tags[key] = value;
        }
      }
    }
    tagsCache = Object.keys(tags).length > 0 ? tags : null;
    tagsCacheValid = true;
    return tagsCache;
  }

  // Extract from tag tree rows
  const tagRows = tagsSection.querySelectorAll('[data-test-id="tag-tree-row"]');
  for (const row of tagRows) {
    const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
    const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
    if (keyEl && valueEl) {
      const key =
        keyEl.getAttribute("title") || keyEl.textContent?.trim() || "";
      const value = getTagValue(valueEl);
      if (key && value) {
        tags[key] = value;
      }
    }
  }

  // Also check highlight rows
  const highlightRows = document.querySelectorAll(
    '[data-test-id="highlight-tag-row"]',
  );
  for (const row of highlightRows) {
    const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
    const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
    if (keyEl && valueEl) {
      const key =
        keyEl.getAttribute("title") || keyEl.textContent?.trim() || "";
      const value = getTagValue(valueEl);
      if (key && value && !tags[key]) {
        tags[key] = value;
      }
    }
  }

  tagsCache = Object.keys(tags).length > 0 ? tags : null;
  tagsCacheValid = true;
  return tagsCache;
}

/**
 * Extract environment from tags or dedicated element
 */
export function extractEnvironment(): string | null {
  const tags = extractTags();
  if (tags?.environment) return tags.environment;

  const envEl = document.querySelector(
    '[data-test-id="environment"], .environment-tag',
  );
  return envEl?.textContent?.trim() ?? null;
}

/**
 * Extract release/version from tags or dedicated element
 */
export function extractRelease(): string | null {
  const tags = extractTags();
  if (tags?.release) return tags.release;

  const releaseEl = document.querySelector(
    '[data-test-id="release"], .release-tag',
  );
  return releaseEl?.textContent?.trim() ?? null;
}

/**
 * Extract level (error, warning, info, etc.) from tags
 */
export function extractLevel(): string | null {
  const tags = extractTags();
  if (tags?.level) return tags.level;

  const levelIndicator = document.querySelector(
    '[data-sentry-element="ColoredLine"]',
  );
  if (levelIndicator) {
    const hiddenText = levelIndicator.querySelector(
      '[data-sentry-element="VisuallyHidden"]',
    );
    if (hiddenText) {
      const text = hiddenText.textContent?.trim() ?? "";
      const match = text.match(/Level:\s*(\w+)/i);
      if (match) return match[1];
    }
  }

  return null;
}

/**
 * Extract URL/route from header or tags
 */
export function extractRoute(): string | null {
  const headerGrid = document.querySelector(
    '[data-sentry-element="HeaderGrid"]',
  );
  if (headerGrid) {
    const spans = headerGrid.querySelectorAll("span");
    for (const span of spans) {
      const text = span.textContent?.trim() ?? "";
      if (text.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\//)) {
        return text;
      }
    }
  }

  const tags = extractTags();
  if (tags) {
    if (tags.transaction) return tags.transaction;
    if (tags.url) return tags.url;
  }

  const highlightRows = document.querySelectorAll(
    '[data-test-id="highlight-tag-row"]',
  );
  for (const row of highlightRows) {
    const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
    if (keyEl) {
      const key = keyEl.getAttribute("title") || keyEl.textContent?.trim();
      if (key === "url" || key === "transaction") {
        const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
        if (valueEl) return valueEl.textContent?.trim() ?? null;
      }
    }
  }

  return null;
}
