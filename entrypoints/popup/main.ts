/**
 * Sentry Issue Extractor - Popup Script
 * Handles the popup UI and communication with the content script
 */

const extractBtn = document.getElementById("extractBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function showStatus(
  message: string,
  type: "success" | "error" | "warning",
): void {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

function hideStatus(): void {
  statusEl.className = "status";
  statusEl.textContent = "";
}

async function extractAndCopy(): Promise<void> {
  extractBtn.disabled = true;
  hideStatus();

  try {
    // Get the current active tab
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      showStatus("Could not access the current tab", "error");
      extractBtn.disabled = false;
      return;
    }

    // Check if we're on a Sentry page
    if (!tab.url?.includes("sentry.io")) {
      showStatus("Please navigate to a Sentry issue page", "warning");
      extractBtn.disabled = false;
      return;
    }

    // Send message to content script
    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        action: "extractAndCopy",
      });

      if (response?.success) {
        showStatus("Issue details copied to clipboard!", "success");
      } else if (response?.error) {
        showStatus(response.error, "error");
      } else {
        showStatus("Unknown error occurred", "error");
      }
    } catch (_error) {
      // Content script might not be loaded yet
      showStatus("Please refresh the Sentry page and try again", "warning");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    showStatus(`Error: ${message}`, "error");
  } finally {
    extractBtn.disabled = false;
  }
}

// Add click listener
extractBtn.addEventListener("click", extractAndCopy);

// Add keyboard shortcut (Enter key)
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !extractBtn.disabled) {
    extractAndCopy();
  }
});
