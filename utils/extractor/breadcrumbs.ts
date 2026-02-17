/**
 * Breadcrumbs Extractor
 * Extracts breadcrumb trail information
 */

import type { Breadcrumb } from "../types";
import { getText } from "./dom-helpers";

/**
 * Extract breadcrumbs from breadcrumbs section
 */
export function extractBreadcrumbs(): Breadcrumb[] | null {
  const breadcrumbs: Breadcrumb[] = [];
  const breadcrumbSection = document.querySelector(
    'section#breadcrumbs, [data-test-id="breadcrumbs"]',
  );
  if (!breadcrumbSection) return null;

  const breadcrumbItems = breadcrumbSection.querySelectorAll(
    '[data-sentry-component="Item"], [data-sentry-element="BreadcrumbItem"]',
  );

  for (const item of breadcrumbItems) {
    // Extract level
    const levelEl = item.querySelector(
      '[data-sentry-element="BreadcrumbLevel"], [data-test-id="breadcrumb-level"]',
    );
    const level = levelEl?.textContent?.trim() ?? "";

    // Extract message/text
    const textEl = item.querySelector(
      '[data-sentry-element="BreadcrumbText"], [data-test-id="breadcrumb-message"]',
    );
    const message = textEl?.textContent?.trim() ?? "";

    // Determine category
    const category = getText('[data-sentry-component="HTTPCrumbContent"]', item)
      ? "http"
      : getText('[data-sentry-component="ExceptionCrumbContent"]', item)
        ? "exception"
        : getText('[data-sentry-component="UICrumbContent"]', item)
          ? "ui"
          : getText('[data-sentry-component="ConsoleCrumbContent"]', item)
            ? "console"
            : "";

    // Extract timestamp
    const timeEl = item.querySelector("time");
    const timestamp = timeEl
      ? timeEl.getAttribute("datetime") || timeEl.textContent?.trim() || ""
      : "";

    if (level || message || category) {
      breadcrumbs.push({ category, type: level, message, timestamp, level });
    }
  }

  // Fallback: raw text content
  if (breadcrumbs.length === 0) {
    const allText = breadcrumbSection.textContent;
    if (allText && allText.length > 10) {
      return [{ raw: allText.substring(0, 3000) }];
    }
  }

  return breadcrumbs.length > 0 ? breadcrumbs : null;
}
