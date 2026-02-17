import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  entrypointsDir: "entrypoints",
  modules: ["@wxt-dev/auto-icons"],
  manifest: {
    name: "Sentry Issue Extractor",
    description: "Extract Sentry issue details and format for Jira",
    version: "1.0.0",
    permissions: ["clipboardWrite", "activeTab"],
    host_permissions: ["https://*.sentry.io/*"],
    action: {
      default_popup: "popup/index.html",
      default_title: "Sentry Issue Extractor",
    },
    // @ts-expect-error Firefox-specific properties
    browser_specific_settings: {
      gecko: {
        id: "sentry-extract@robinheidenis.dev",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
});
