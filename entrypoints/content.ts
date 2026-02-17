/**
 * Sentry Issue Extractor - Content Script
 * Extracts issue details from Sentry pages and copies to clipboard
 */

import { extractAllData } from "@/utils/extractor/index";
import {
  copyToClipboard,
  formatToJiraMarkdown,
  showNotification,
} from "@/utils/formatter";
import type { ExtractAndCopyResult } from "@/utils/types";

export default defineContentScript({
  matches: ["https://*.sentry.io/*"],
  runAt: "document_idle",
  main() {
    /**
     * Extract data and copy to clipboard
     */
    async function extractAndCopy(): Promise<ExtractAndCopyResult> {
      try {
        const data = extractAllData();

        if (!data.title && !data.errorMessage && !data.shortId) {
          return {
            success: false,
            error:
              "Could not extract issue data. Make sure you are on a Sentry issue page.",
          };
        }

        const markdown = formatToJiraMarkdown(data);
        const copied = await copyToClipboard(markdown);

        if (copied) {
          showNotification("Issue details copied to clipboard!", true);
          return { success: true, data };
        } else {
          showNotification("Failed to copy to clipboard", false);
          return { success: false, error: "Failed to copy to clipboard" };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        showNotification(`Error: ${errorMessage}`, false);
        return { success: false, error: errorMessage };
      }
    }

    // Listen for messages from popup
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === "extractAndCopy") {
        extractAndCopy().then((result) => {
          sendResponse(result);
        });
        return true; // Keep the message channel open for async response
      }

      if (message.action === "ping") {
        sendResponse({ status: "ready" });
        return true;
      }
    });

    console.log("[Sentry Extractor] Content script loaded");
  },
});
