/**
 * Jira Cloud Markdown Formatter for Sentry Data
 * Uses standard markdown syntax that works in Jira Cloud's new editor
 */

import type {
  Breadcrumb,
  FormatOptions,
  SentryIssueData,
  StackTrace,
} from "./types";

// Format a key-value pair as a bullet point with bold key
function formatKeyValue(key: string, value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return `- **${key}:** ${value}`;
}

// Format an object as a bullet list
function formatAsList(obj: Record<string, unknown> | null | undefined): string {
  if (!obj || Object.keys(obj).length === 0) return "";
  let list = "";
  for (const [key, value] of Object.entries(obj)) {
    const displayValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    list += `- **${key}:** ${displayValue}\n`;
  }
  return list;
}

// Format tags with nesting by prefix (e.g., runtime.name nests under runtime)
function formatTagsNested(
  tags: Record<string, string> | null | undefined,
): string {
  if (!tags || Object.keys(tags).length === 0) return "";
  const grouped: Record<string, Record<string, string>> = {};
  const standalone: Record<string, string> = {};

  for (const [key, value] of Object.entries(tags)) {
    if (key.includes(".")) {
      const [prefix, ...rest] = key.split(".");
      const subKey = rest.join(".");
      if (!grouped[prefix]) grouped[prefix] = {};
      grouped[prefix][subKey] = value;
    } else {
      standalone[key] = value;
    }
  }

  let output = "";
  const outputtedPrefixes = new Set<string>();

  for (const [key, value] of Object.entries(standalone)) {
    if (grouped[key]) {
      output += `- **${key}:** ${value}\n`;
      for (const [subKey, subValue] of Object.entries(grouped[key])) {
        output += `  - ${subKey}: ${subValue}\n`;
      }
      outputtedPrefixes.add(key);
    } else {
      output += `- **${key}:** ${value}\n`;
    }
  }

  for (const [prefix, subTags] of Object.entries(grouped)) {
    if (!outputtedPrefixes.has(prefix)) {
      output += `- **${prefix}:**\n`;
      for (const [subKey, value] of Object.entries(subTags)) {
        output += `  - ${subKey}: ${value}\n`;
      }
    }
  }
  return output;
}

// Format additional data as a code block (always JSON for complex objects)
function formatAdditionalData(
  data: Record<string, unknown> | null | undefined,
): string {
  if (!data || Object.keys(data).length === 0) return "";
  try {
    return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  } catch {
    return formatAsList(data);
  }
}

// Format stack trace
function formatStackTrace(stackTrace: StackTrace | null): string {
  if (!stackTrace) return "";
  let output = "";
  if (stackTrace.exceptionValue) {
    output += `**Exception:** ${stackTrace.exceptionValue}\n\n`;
  }
  if (stackTrace.raw) {
    output += `\`\`\`\n${stackTrace.raw}\n\`\`\``;
  } else if (stackTrace.frames && stackTrace.frames.length > 0) {
    output += "```\n";
    stackTrace.frames.forEach((frame, index) => {
      const location = frame.filename
        ? `${frame.filename}${frame.lineNo ? `:${frame.lineNo}` : ""}`
        : "unknown";
      const func = frame.function || "<anonymous>";
      const marker = frame.isSystem ? "  " : "→ ";
      output += `${marker}${index + 1}. ${func} at ${location}\n`;
      if (frame.context) {
        output += `      ${frame.context.substring(0, 200)}\n`;
      }
    });
    output += "```";
  }
  return output;
}

// Format breadcrumbs as a list
function formatBreadcrumbs(breadcrumbs: Breadcrumb[] | null): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return "";
  if (breadcrumbs.length === 1 && breadcrumbs[0].raw) {
    return `\`\`\`\n${breadcrumbs[0].raw}\n\`\`\``;
  }
  let output = "";
  const recentBreadcrumbs = breadcrumbs.slice(-15);
  recentBreadcrumbs.forEach((bc) => {
    const time = bc.timestamp || "";
    const category = bc.category || "";
    const level = bc.type || bc.level || "";
    const message = bc.message ? bc.message.substring(0, 100) : "";
    output += `- ${time ? `[${time}]` : ""} ${category ? `**${category}**` : ""} ${level ? `(${level})` : ""} ${message}\n`;
  });
  return output;
}

// Format contexts
function formatContexts(
  contexts: Record<string, Record<string, string>> | null,
): string {
  if (!contexts || Object.keys(contexts).length === 0) return "";
  let output = "";
  for (const [contextName, contextData] of Object.entries(contexts)) {
    if (
      typeof contextData === "object" &&
      Object.keys(contextData).length > 0
    ) {
      output += `\n**${contextName}:**\n`;
      output += formatAsList(contextData);
    }
  }
  return output;
}

// Main formatting function - uses Jira Cloud compatible markdown
export function formatToJiraMarkdown(
  data: SentryIssueData,
  options: FormatOptions = {},
): string {
  const opts: FormatOptions = {
    includeBreadcrumbs: options.includeBreadcrumbs !== false,
    includeContexts: options.includeContexts !== false,
    includeTags: options.includeTags !== false,
    ...options,
  };

  const lines: string[] = [];
  const headerTitle = data.shortId
    ? `${data.shortId}: ${data.title}`
    : data.title;
  lines.push(
    `## ${headerTitle}`,
    "",
    `[View in Sentry](${data.url})`,
    "",
    "---",
    "",
    "### Issue Overview",
    "",
  );

  if (data.projectName) lines.push(formatKeyValue("Project", data.projectName));
  if (data.shortId) lines.push(formatKeyValue("Issue ID", data.shortId));
  else if (data.issueId) lines.push(formatKeyValue("Issue ID", data.issueId));
  if (data.status) lines.push(formatKeyValue("Status", data.status));
  if (data.priority) lines.push(formatKeyValue("Priority", data.priority));
  if (data.level) lines.push(formatKeyValue("Level", data.level));
  if (data.environment)
    lines.push(formatKeyValue("Environment", data.environment));
  if (data.release) lines.push(formatKeyValue("Release", data.release));
  if (data.eventCount) lines.push(formatKeyValue("Events", data.eventCount));
  if (data.userCount)
    lines.push(formatKeyValue("Users Affected", data.userCount));
  if (data.route) lines.push(formatKeyValue("Route/URL", data.route));
  if (data.timestamps?.firstSeen)
    lines.push(formatKeyValue("First Seen", data.timestamps.firstSeen));
  if (data.timestamps?.lastSeen)
    lines.push(formatKeyValue("Last Seen", data.timestamps.lastSeen));
  lines.push("");

  if (data.errorMessage) {
    lines.push("### Error Message", "", "```", data.errorMessage, "```", "");
  }
  if (data.stackTrace) {
    lines.push("### Stack Trace", "", formatStackTrace(data.stackTrace), "");
  }
  if (opts.includeBreadcrumbs && data.breadcrumbs?.length) {
    lines.push(
      `### Breadcrumbs (${data.breadcrumbs.length} entries)`,
      "",
      formatBreadcrumbs(data.breadcrumbs),
      "",
    );
  }
  if (data.httpRequest && Object.keys(data.httpRequest).length > 0) {
    lines.push("### HTTP Request", "", formatAsList(data.httpRequest), "");
  }
  if (data.userInfo && Object.keys(data.userInfo).length > 0) {
    lines.push("### User Information", "", formatAsList(data.userInfo), "");
  }
  if (opts.includeTags && data.tags && Object.keys(data.tags).length > 0) {
    lines.push("### Tags", "", formatTagsNested(data.tags), "");
  }
  if (
    opts.includeContexts &&
    data.contexts &&
    Object.keys(data.contexts).length > 0
  ) {
    lines.push("### Contexts", "", formatContexts(data.contexts), "");
  }
  if (data.additionalData && Object.keys(data.additionalData).length > 0) {
    lines.push(
      "### Additional Data",
      "",
      formatAdditionalData(data.additionalData),
      "",
    );
  }

  lines.push(
    "---",
    `*Extracted from Sentry on ${new Date().toISOString().split("T")[0]}*`,
  );
  return lines.join("\n");
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = "position:fixed;left:-999999px;top:-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      textArea.remove();
      return true;
    } catch {
      textArea.remove();
      return false;
    }
  }
}

// Show success/error notification
export function showNotification(message: string, isSuccess = true): void {
  const existing = document.getElementById("sentry-extract-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.id = "sentry-extract-notification";
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 16px 24px; border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; font-weight: 500; z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s ease, transform 0.3s ease;
    display: flex; align-items: center; gap: 10px;
    ${isSuccess ? "background: #10B981; color: white;" : "background: #EF4444; color: white;"}
  `;

  const icon = isSuccess ? "✓" : "✕";
  notification.innerHTML = `<span style="font-size: 18px;">${icon}</span><span>${message}</span>`;
  document.body.appendChild(notification);

  notification.style.opacity = "0";
  notification.style.transform = "translateX(100px)";
  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100px)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
