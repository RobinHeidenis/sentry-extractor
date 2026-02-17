/**
 * TypeScript interfaces for Sentry issue data extraction
 */

export interface StackFrame {
  filename: string;
  lineNo: string;
  function: string;
  context: string;
  isSystem: boolean;
  isExpanded: boolean;
}

export interface StackTrace {
  frames?: StackFrame[];
  raw?: string;
  exceptionValue?: string;
}

export interface Breadcrumb {
  category?: string;
  type?: string;
  message?: string;
  timestamp?: string;
  level?: string;
  raw?: string;
}

export interface Timestamps {
  firstSeen?: string;
  lastSeen?: string;
}

export interface SentryIssueData {
  url: string;
  projectName: string;
  issueId: string;
  shortId: string | null;
  title: string;
  errorMessage: string | null;
  route: string | null;
  eventCount: string;
  userCount: string;
  environment: string | null;
  release: string | null;
  priority: string | null;
  status: string | null;
  level: string | null;
  timestamps: Timestamps | null;
  userInfo: Record<string, string> | null;
  stackTrace: StackTrace | null;
  breadcrumbs: Breadcrumb[] | null;
  httpRequest: Record<string, string> | null;
  tags: Record<string, string> | null;
  contexts: Record<string, Record<string, string>> | null;
  additionalData: Record<string, unknown> | null;
}

export interface FormatOptions {
  includeBreadcrumbs?: boolean;
  includeContexts?: boolean;
  includeTags?: boolean;
}

export interface ExtractAndCopyResult {
  success: boolean;
  data?: SentryIssueData;
  markdown?: string;
  error?: string;
}
