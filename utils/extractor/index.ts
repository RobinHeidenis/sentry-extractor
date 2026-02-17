/**
 * Sentry Issue Data Extractor
 * Main entry point - combines all extraction modules
 */

import type { SentryIssueData } from "../types";
import { extractAdditionalData } from "./additional-data";
import {
  extractErrorMessage,
  extractEventCount,
  extractIssueId,
  extractIssueTitle,
  extractPriority,
  extractProjectName,
  extractShortId,
  extractStatus,
  extractTimestamps,
  extractUserCount,
} from "./basic-info";
import { extractBreadcrumbs } from "./breadcrumbs";
import { extractContexts, extractUserInfo } from "./contexts";
import { extractHttpRequest } from "./http-request";
import { extractStackTrace } from "./stack-trace";
import {
  clearTagsCache,
  extractEnvironment,
  extractLevel,
  extractRelease,
  extractRoute,
  extractTags,
} from "./tags";

/**
 * Extract all data from the current Sentry issue page
 */
export function extractAllData(): SentryIssueData {
  // Clear the tags cache before extraction to ensure fresh data
  clearTagsCache();

  return {
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
    additionalData: extractAdditionalData(),
  };
}

// Re-export individual extractors for flexibility
export {
  extractTags,
  extractContexts,
  extractStackTrace,
  extractBreadcrumbs,
  extractHttpRequest,
  extractAdditionalData,
  extractUserInfo,
};
