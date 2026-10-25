/** IPC channel names shared by the main process. The preload script inlines
 * the same strings, because sandboxed preloads cannot import local modules. */
export const channels = {
  presenceConfigure: "presence:configure",
  presenceGetStatus: "presence:get-status",
  presenceStatus: "presence:status",
} as const;
