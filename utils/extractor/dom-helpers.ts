/**
 * DOM Helper Functions
 * Common utilities for safely querying and extracting data from the DOM
 */

/**
 * Safely get text content from an element matching a selector
 */
export function getText(
  selector: string,
  context: Document | Element = document,
): string | null {
  const element = context.querySelector(selector);
  return element ? (element.textContent?.trim() ?? null) : null;
}

/**
 * Get the value of a tag element, handling nested structures
 */
export function getTagValue(valueEl: Element | null): string {
  if (!valueEl) return "";
  const nestedEl = valueEl.querySelector(
    'span[data-test-id="loaded-device-name"], a, [data-sentry-element="TagLinkText"] a',
  );
  if (nestedEl) return nestedEl.textContent?.trim() ?? "";
  return valueEl.textContent?.trim() ?? "";
}

/**
 * Recursively extract structured data (objects, arrays, primitives) from DOM elements
 */
export function extractStructuredValue(element: Element): unknown {
  if (!element) return null;

  const collapsible = element.querySelector(
    '[data-sentry-component="CollapsibleValue"]',
  );
  if (collapsible) {
    return parseCollapsibleValue(collapsible);
  }

  const numberEl = element.querySelector('[data-test-id="value-number"]');
  if (numberEl) {
    const num = parseFloat(numberEl.textContent?.trim() ?? "");
    return Number.isNaN(num) ? numberEl.textContent?.trim() : num;
  }

  const stringEl = element.querySelector(
    '[data-test-id="value-string"], pre.val-string',
  );
  if (stringEl) return stringEl.textContent?.trim();

  const boolEl = element.querySelector('[data-test-id="value-boolean"]');
  if (boolEl) return boolEl.textContent?.trim() === "true";

  const nullEl = element.querySelector('[data-test-id="value-null"]');
  if (nullEl) return null;

  return element.textContent?.trim() || null;
}

/**
 * Parse a CollapsibleValue component into a JS object/array
 */
export function parseCollapsibleValue(collapsible: Element): unknown {
  const firstChar = collapsible.textContent?.trim().charAt(0);
  const isArray = firstChar === "[";
  return isArray ? parseArrayValue(collapsible) : parseObjectValue(collapsible);
}

/**
 * Parse object structure from CollapsibleValue
 * Uses data attributes instead of fragile generated class names
 */
export function parseObjectValue(
  container: Element,
): Record<string, unknown> | string {
  const result: Record<string, unknown> = {};

  // Try multiple selector strategies for the content container
  const contentDiv =
    container.querySelector('[data-sentry-element="CollapsibleContent"]') ||
    container.querySelector('[role="group"]') ||
    container.querySelector(":scope > div > div");

  if (!contentDiv) {
    return container.textContent?.trim() ?? "";
  }

  const childDivs = contentDiv.children;
  for (const child of childDivs) {
    const keyEl = child.querySelector('[data-sentry-element="ValueObjectKey"]');
    if (!keyEl) continue;
    const key = keyEl.textContent?.trim() ?? "";

    const nestedCollapsible = child.querySelector(
      '[data-sentry-component="CollapsibleValue"]',
    );
    if (nestedCollapsible && nestedCollapsible !== container) {
      result[key] = parseCollapsibleValue(nestedCollapsible);
    } else {
      const valueEl = child.querySelector('[data-test-id^="value-"]');
      if (valueEl) {
        result[key] = parseValueElement(valueEl);
      }
    }
  }

  return Object.keys(result).length > 0
    ? result
    : (container.textContent?.trim() ?? "");
}

/**
 * Parse array structure from CollapsibleValue
 */
export function parseArrayValue(container: Element): unknown[] | string {
  const result: unknown[] = [];

  const contentDiv =
    container.querySelector('[data-sentry-element="CollapsibleContent"]') ||
    container.querySelector('[role="group"]') ||
    container.querySelector(":scope > div > div");

  if (!contentDiv) {
    return container.textContent?.trim() ?? "";
  }

  const childDivs = contentDiv.children;
  for (const child of childDivs) {
    const nestedCollapsible = child.querySelector(
      '[data-sentry-component="CollapsibleValue"]',
    );
    if (nestedCollapsible) {
      result.push(parseCollapsibleValue(nestedCollapsible));
    } else {
      const valueEl = child.querySelector('[data-test-id^="value-"]');
      if (valueEl) {
        result.push(parseValueElement(valueEl));
      }
    }
  }

  return result.length > 0 ? result : (container.textContent?.trim() ?? "");
}

/**
 * Parse a value element based on its data-test-id
 */
function parseValueElement(valueEl: Element): unknown {
  const testId = valueEl.getAttribute("data-test-id");
  const text = valueEl.textContent?.trim() ?? "";

  switch (testId) {
    case "value-number": {
      const num = parseFloat(text);
      return Number.isNaN(num) ? text : num;
    }
    case "value-boolean":
      return text === "true";
    case "value-null":
      return null;
    default:
      return text;
  }
}

/**
 * Extract key-value pairs from a section using multiple strategies
 */
export function extractKeyValuePairsFromSection(
  section: Element,
): Record<string, string> {
  const data: Record<string, string> = {};

  // Strategy 1: Key-value table
  const kvTable = section.querySelector(
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
          data[key] =
            typeof value === "object" ? JSON.stringify(value) : String(value);
        }
      }
    }
    if (Object.keys(data).length > 0) return data;
  }

  // Strategy 2: Tree rows (data-test-id)
  const treeRows = section.querySelectorAll('[data-test-id="tag-tree-row"]');
  for (const row of treeRows) {
    const keyEl = row.querySelector('[data-sentry-element="TreeKey"]');
    const valueEl = row.querySelector('[data-sentry-element="TreeValue"]');
    if (keyEl && valueEl) {
      const key =
        keyEl.getAttribute("title") || keyEl.textContent?.trim() || "";
      const valueSpan = valueEl.querySelector("span[data-test-id], a");
      const value = valueSpan
        ? (valueSpan.textContent?.trim() ?? "")
        : (valueEl.textContent?.trim() ?? "");
      if (key && value) {
        data[key] = value;
      }
    }
  }

  // Strategy 3: Definition lists
  const dts = section.querySelectorAll("dt");
  for (const dt of dts) {
    const dd = dt.nextElementSibling;
    if (dd && dd.tagName === "DD") {
      data[dt.textContent?.trim() ?? ""] = dd.textContent?.trim() ?? "";
    }
  }

  return data;
}
