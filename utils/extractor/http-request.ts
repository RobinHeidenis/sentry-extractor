/**
 * HTTP Request Extractor
 * Extracts HTTP request information
 */

import { extractKeyValuePairsFromSection } from "./dom-helpers";

/**
 * Extract HTTP request info from request section
 */
export function extractHttpRequest(): Record<string, string> | null {
  const requestSection = document.querySelector(
    'section#request, [data-test-id="request"]',
  );
  if (!requestSection) return null;

  const request: Record<string, string> = {};

  // Extract key-value pairs
  const data = extractKeyValuePairsFromSection(requestSection);
  if (Object.keys(data).length > 0) {
    Object.assign(request, data);
  }

  // Try to get URL from link elements
  const urlEl = requestSection.querySelector(
    'a[href], [data-sentry-element="TagLinkText"]',
  );
  if (urlEl) {
    request.url = urlEl.textContent?.trim() ?? "";
  }

  return Object.keys(request).length > 0 ? request : null;
}
