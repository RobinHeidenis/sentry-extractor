/**
 * Stack Trace Extractor
 * Extracts stack trace and exception information
 */

import type { StackFrame, StackTrace } from "../types";
import { getText } from "./dom-helpers";

/**
 * Extract stack trace from exception section
 */
export function extractStackTrace(): StackTrace | null {
  const frames: StackFrame[] = [];
  const exceptionSection = document.querySelector(
    'section#exception, [data-test-id="exception"]',
  );
  if (!exceptionSection) return null;

  // Extract exception value
  const exceptionValueEl = exceptionSection.querySelector(
    '[data-test-id="exception-value"] h5',
  );
  const exceptionValue = exceptionValueEl?.textContent?.trim() ?? undefined;

  // Extract frames using data attributes
  const frameElements = exceptionSection.querySelectorAll(
    '[data-test-id="line"].frame, li.frame, [data-sentry-component="Frame"]',
  );

  for (const frame of frameElements) {
    const filename =
      getText(
        '[data-test-id="filename"], code.filename, [data-sentry-element="Filename"]',
        frame,
      ) || "";

    const funcName =
      getText(
        '[data-test-id="function"], [data-sentry-component="FunctionName"], [data-sentry-element="Function"]',
        frame,
      ) || "";

    // Extract line number
    const lineInfoEl = frame.querySelector(
      '[data-sentry-element="InFramePosition"], [data-test-id="line-number"]',
    );
    const lineNo = lineInfoEl?.textContent?.trim() ?? "";

    // Extract context code
    const contextEl = frame.querySelector(
      '[data-test-id="frame-context"], [data-sentry-element="Context"]',
    );
    let context = "";
    if (contextEl) {
      const contextLines = contextEl.querySelectorAll(
        '[data-test-id="context-line"], [data-sentry-element="ContextLine"]',
      );
      context = Array.from(contextLines)
        .map((line) => line.textContent)
        .join("\n");
    }

    const isSystem = frame.classList.contains("system-frame");
    const isExpanded = frame.classList.contains("expanded");

    if (filename || funcName) {
      frames.push({
        filename,
        lineNo,
        function: funcName,
        context: context.substring(0, 1000),
        isSystem,
        isExpanded,
      });
    }
  }

  // Fallback: raw stack trace content
  if (frames.length === 0) {
    const stackContent = document.querySelector(
      '[data-test-id="stack-trace-content"], [data-sentry-element="StackTrace"]',
    );
    if (stackContent) {
      return {
        raw: stackContent.textContent?.trim().substring(0, 5000),
        exceptionValue,
      };
    }
  }

  return frames.length > 0 ? { frames, exceptionValue } : null;
}
