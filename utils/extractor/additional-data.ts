/**
 * Additional Data Extractor
 * Extracts extra/additional data section
 */

import { extractStructuredValue } from "./dom-helpers";

/**
 * Extract additional data from extra section
 */
export function extractAdditionalData(): Record<string, unknown> | null {
  const extraSection = document.querySelector(
    'section#extra, [data-test-id="extra"]',
  );
  if (!extraSection) return null;

  const data: Record<string, unknown> = {};

  // Try key-value table
  const kvTable = extraSection.querySelector(
    'table.key-value, [data-sentry-component="KeyValueList"]',
  );
  if (kvTable) {
    const rows = kvTable.querySelectorAll("tr");
    for (const row of rows) {
      const keyCell = row.querySelector("td.key");
      const valCell = row.querySelector("td.val");
      if (keyCell && valCell) {
        const key = keyCell.textContent?.trim() ?? "";
        const value = extractStructuredValue(valCell);
        if (key && value !== null && value !== undefined) {
          data[key] = value;
        }
      }
    }
  }

  return Object.keys(data).length > 0 ? data : null;
}
