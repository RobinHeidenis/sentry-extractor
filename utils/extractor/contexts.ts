/**
 * Contexts Extractor
 * Extracts context information (Browser, OS, Device, User, etc.)
 */

import { extractKeyValuePairsFromSection } from "./dom-helpers";

/**
 * Extract contexts from contexts section
 */
export function extractContexts(): Record<
  string,
  Record<string, string>
> | null {
  const contexts: Record<string, Record<string, string>> = {};
  const contextsSection = document.querySelector(
    'section#contexts, [data-test-id="contexts"]',
  );
  if (!contextsSection) return null;

  const contextCards = contextsSection.querySelectorAll(
    '[data-sentry-component="Card"]',
  );

  for (const card of contextCards) {
    // Extract card title using multiple strategies
    let cardTitle = "Unknown";

    // Strategy 1: Look for header element
    const headerEl = card.querySelector(
      '[data-sentry-element="Header"], [data-sentry-component="CardHeader"]',
    );
    if (headerEl) {
      cardTitle = headerEl.textContent?.trim() ?? "Unknown";
    } else {
      // Strategy 2: First div in header container
      const headerContainer = card.querySelector(
        ':scope > div:first-child, [role="heading"]',
      );
      if (headerContainer) {
        const titleDiv = headerContainer.querySelector("div:first-child");
        if (titleDiv) cardTitle = titleDiv.textContent?.trim() ?? "Unknown";
      }
    }

    const cardData: Record<string, string> = {};

    // Extract content from Content components
    const contentWrappers = card.querySelectorAll(
      '[data-sentry-component="Content"]',
    );
    for (const wrapper of contentWrappers) {
      // Try to find key element
      const keyDiv = wrapper.querySelector(
        '[data-sentry-element="Key"], :scope > div:first-child',
      );
      const valueWrapper = wrapper.querySelector(
        '[data-sentry-element="ValueWrapper"]',
      );

      if (keyDiv && valueWrapper) {
        const key = keyDiv.textContent?.trim() ?? "";
        let value = "";

        // Try different value extraction strategies
        const valueEl = valueWrapper.querySelector(
          '[data-test-id^="value-"], [data-sentry-element="Value"]',
        );
        if (valueEl) {
          value = valueEl.textContent?.trim() ?? "";
        } else {
          // Handle relative time components
          const relativeTimeEl = valueWrapper.querySelector(
            '[data-sentry-component="getRelativeTimeFromEventDateCreated"]',
          );
          if (relativeTimeEl) {
            const clone = valueWrapper.cloneNode(true) as Element;
            const relTime = clone.querySelector(
              '[data-sentry-component="getRelativeTimeFromEventDateCreated"]',
            );
            relTime?.remove();
            value = clone.textContent?.trim() ?? "";
          } else {
            const linkEl = valueWrapper.querySelector("a");
            value = linkEl
              ? (linkEl.textContent?.trim() ?? "")
              : (valueWrapper.textContent?.trim() ?? "");
          }
        }

        if (key && value) {
          cardData[key] = value;
        }
      }
    }

    if (Object.keys(cardData).length > 0) {
      contexts[cardTitle] = cardData;
    }
  }

  return Object.keys(contexts).length > 0 ? contexts : null;
}

/**
 * Extract user info from user context or dedicated section
 */
export function extractUserInfo(): Record<string, string> | null {
  // Try dedicated user section first
  const userSection = document.querySelector(
    '[data-test-id="user-context"], [data-test-id="user"], .user-info',
  );
  if (userSection) {
    return extractKeyValuePairsFromSection(userSection);
  }

  // Fall back to contexts
  const contexts = extractContexts();
  if (contexts?.User) {
    return contexts.User;
  }

  return null;
}
