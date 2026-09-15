import type { DaydockPlugin } from "./api";
import { capacityPlugin } from "./native/capacity";
import { documentLinkPlugin } from "./native/documentLink";
import { timeBlockPlugin } from "./native/timeBlock";
import { timeEntryPlugin } from "./native/timeEntry";

// Daydock plugins are deliberately bundled and reviewed with the application.
// This explicit registry is the only installation mechanism for now.
export const daydockPlugins: readonly DaydockPlugin[] = [
  timeBlockPlugin,
  timeEntryPlugin,
  capacityPlugin,
  documentLinkPlugin,
];
