# Sentry Issue Extractor

A browser extension that extracts Sentry issue details and formats them as Jira-compatible markdown for easy clipboard copying.

## Features

- 📋 One-click extraction of Sentry issue data
- 📝 Formats output as Jira Cloud markdown
- 🏷️ Extracts tags with nested property support (e.g., `runtime.name` nests under `runtime`)
- 📚 Captures stack traces, breadcrumbs, contexts, and more
- 🔗 Includes direct link back to the Sentry issue
- 🦊 Works on Chrome, Firefox, and Edge

## Installation

### Chrome / Edge

1. Download the latest `sentry-extract-x.x.x-chrome.zip` from [Releases](../../releases)
2. Extract the zip file
3. Go to `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. Click **Load unpacked** and select the extracted folder

### Firefox

Install from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/sentry-issue-extractor/) (coming soon)

Or install manually:
1. Download the latest `sentry-extract-x.x.x-firefox.zip` from [Releases](../../releases)
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the zip file

## Usage

1. Navigate to any Sentry issue page (`https://*.sentry.io/issues/*`)
2. Click the extension icon in your toolbar
3. Click **Extract & Copy**
4. Paste into Jira, Confluence, or any markdown-compatible editor

## What Gets Extracted

| Data | Description |
|------|-------------|
| Basic Info | Project, issue ID, title, error message |
| Metrics | Event count, user count, first/last seen |
| Tags | All tags with nested property grouping |
| Stack Trace | Exception details and stack frames |
| Breadcrumbs | Navigation/action trail before the error |
| Contexts | Browser, OS, device, user info |
| HTTP Request | Request details if available |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server (Chrome)
pnpm dev

# Start development server (Firefox)
pnpm dev:firefox
```

### Build

```bash
# Build for Chrome
pnpm build

# Build for Firefox
pnpm build:firefox

# Create distributable zips
pnpm zip
pnpm zip:firefox
```

### Lint & Format

```bash
# Check for issues
pnpm lint

# Fix issues
pnpm lint:fix

# Format code
pnpm format
```

## Tech Stack

- [WXT](https://wxt.dev/) - Next-gen Web Extension Framework
- [TypeScript](https://www.typescriptlang.org/)
- [Biome](https://biomejs.dev/) - Linter & Formatter
- [Vite](https://vitejs.dev/) - Build tool

## License

MIT

