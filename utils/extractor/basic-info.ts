/**
 * Basic Issue Information Extractors
 * Extracts project name, issue ID, title, error message, counts, etc.
 */

import { getText } from "./dom-helpers";

/**
 * Extract project name from header breadcrumb area
 */
export function extractProjectName(): string {
  // Primary: aria-description attribute on project link
  const projectLink = document.querySelector(
    'a[aria-description][href*="/insights/projects/"]',
  );
  if (projectLink) {
    const desc = projectLink.getAttribute("aria-description");
    if (desc) return desc;
  }

  // Fallback: project link in breadcrumb
  const projectLinkAlt = document.querySelector(
    '[data-sentry-component="IssueIdBreadcrumb"] a[href*="/projects/"]',
  );
  if (projectLinkAlt) {
    return projectLinkAlt.textContent?.trim() ?? "Unknown Project";
  }

  // Try platform icon title
  const platformIcon = document.querySelector(
    '[data-sentry-component="PlatformList"] img',
  );
  if (platformIcon) {
    const testId = platformIcon.getAttribute("data-test-id");
    if (testId) {
      return testId.replace("platform-icon-", "").replace(/-/g, " ");
    }
  }

  // Try to extract from URL
  const urlMatch = window.location.href.match(/project=(\d+)/);
  if (urlMatch) return `Project ID: ${urlMatch[1]}`;

  return "Unknown Project";
}

/**
 * Extract short issue ID (e.g., "HOORAYHR-BACKEND-4FN")
 */
export function extractShortId(): string | null {
  const selectors = [
    '[data-sentry-component="ShortId"] .auto-select-text span',
    '[data-sentry-component="AutoSelectText"] span',
    '[data-sentry-element="ShortIdCopyable"] span',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.textContent?.trim() ?? null;
  }

  return null;
}

/**
 * Extract issue ID from URL or page
 */
export function extractIssueId(): string {
  const shortId = extractShortId();
  if (shortId) return shortId;

  const urlMatch = window.location.pathname.match(/\/issues\/(\d+)/);
  if (urlMatch) return urlMatch[1];

  return "Unknown";
}

/**
 * Extract issue title
 */
export function extractIssueTitle(): string {
  const selectors = [
    '[data-sentry-element="PrimaryTitle"]',
    '[data-sentry-component="EventTitle"]',
    '[data-sentry-element="Title"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.textContent?.trim() ?? "Unknown Issue";
  }

  return document.title.split("|")[0].trim() || "Unknown Issue";
}

/**
 * Extract error message/culprit from EventMessage component
 */
export function extractErrorMessage(): string | null {
  const eventMsg = document.querySelector(
    '[data-sentry-component="EventMessage"]',
  );
  if (eventMsg) {
    const noMsgEl = eventMsg.querySelector('[data-sentry-element="NoMessage"]');
    if (noMsgEl) return null;

    const msgText = eventMsg.textContent?.trim();
    if (msgText && !msgText.includes("(No error message)")) return msgText;
  }

  const exceptionValue = document.querySelector(
    '[data-test-id="exception-value"]',
  );
  if (exceptionValue) return exceptionValue.textContent?.trim() ?? null;

  return null;
}

/**
 * Extract event count using Count component's title attribute
 */
export function extractEventCount(): string {
  const countElements = document.querySelectorAll(
    '[data-sentry-component="Count"]',
  );
  if (countElements.length > 0) {
    const eventsEl = countElements[0];
    const title = eventsEl.getAttribute("title");
    if (title) return title;
    return eventsEl.textContent?.trim() ?? "Unknown";
  }
  return "Unknown";
}

/**
 * Extract user count
 */
export function extractUserCount(): string {
  const countElements = document.querySelectorAll(
    '[data-sentry-component="Count"]',
  );
  if (countElements.length > 1) {
    const usersEl = countElements[1];
    const title = usersEl.getAttribute("title");
    if (title) return title;
    return usersEl.textContent?.trim() ?? "0";
  }
  return "0";
}

/**
 * Extract priority from header
 */
export function extractPriority(): string | null {
  const priorityTag = document.querySelector(
    '[aria-label="Modify issue priority"] [data-sentry-component="Tag"]',
  );
  if (priorityTag) {
    const hiddenText = priorityTag.querySelector(
      '[data-sentry-element="VisuallyHidden"]',
    );
    if (hiddenText) return hiddenText.textContent?.trim() ?? null;
    return priorityTag.textContent?.replace(/[↓↑]/g, "").trim() ?? null;
  }
  return null;
}

/**
 * Extract issue status
 */
export function extractStatus(): string | null {
  const statusSpans = document.querySelectorAll(
    '[data-sentry-element="HeaderGrid"] span',
  );
  const validStatuses = [
    "ongoing",
    "resolved",
    "ignored",
    "archived",
    "unresolved",
  ];

  for (const span of statusSpans) {
    const text = span.textContent?.trim().toLowerCase();
    if (text && validStatuses.includes(text)) {
      return span.textContent?.trim() ?? null;
    }
  }
  return null;
}

/**
 * Extract first seen / last seen timestamps
 */
export function extractTimestamps(): {
  firstSeen?: string;
  lastSeen?: string;
} | null {
  const timestamps: { firstSeen?: string; lastSeen?: string } = {};

  const firstSeen = getText('[data-test-id="first-seen"], .first-seen');
  const lastSeen = getText('[data-test-id="last-seen"], .last-seen');

  if (firstSeen) timestamps.firstSeen = firstSeen;
  if (lastSeen) timestamps.lastSeen = lastSeen;

  const statsItems = document.querySelectorAll(
    '[data-test-id="stats-item"], .stats-item',
  );
  for (const item of statsItems) {
    const label = getText(".label, dt", item);
    const value = getText(".value, dd, time", item);
    if (label && value) {
      if (label.toLowerCase().includes("first")) timestamps.firstSeen = value;
      if (label.toLowerCase().includes("last")) timestamps.lastSeen = value;
    }
  }

  return Object.keys(timestamps).length > 0 ? timestamps : null;
}
