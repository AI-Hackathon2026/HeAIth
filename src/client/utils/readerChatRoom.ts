export const CHAT_DESIGN = {
  navy: "#1a2744",
  gold: "#c97c2a",
  paper: "#faf8f3",
  border: "#d0c4aa",
  muted: "#8a7a60",
  bg: "#f4f1ec",
} as const;

export const PANEL_TRANSITION_MS = 320;

export const READER_CHAT_ROOM = {
  fabSizeRem: 8,
  fabBottomRem: 1.25,
  fabRightRem: 1.25,
  panelWidthRem: 52,
  panelHeightRem: 68,
  panelMaxWidthCss: "calc(100vw - 2.5rem)",
  panelMaxHeightCss: "85dvh",
} as const;

export type DocumentChatLayout = "default" | "reader";

export function getReaderChatRoomStyles(options: {
  layout: DocumentChatLayout;
  readerFullscreen?: boolean;
}) {
  const windowedReader =
    options.layout === "reader" && !options.readerFullscreen;
  const scale = windowedReader ? 0.5 : 1;
  const { readerFullscreen = false } = options;

  const fabSize = `${READER_CHAT_ROOM.fabSizeRem * scale}rem`;
  const fabBottom = `${READER_CHAT_ROOM.fabBottomRem}rem`;
  const fabRight = `${READER_CHAT_ROOM.fabRightRem}rem`;

  const panelWidth =
    options.layout === "reader"
      ? `min(${READER_CHAT_ROOM.panelWidthRem * scale}rem, ${READER_CHAT_ROOM.panelMaxWidthCss})`
      : "360px";
  const panelHeight =
    options.layout === "reader"
      ? `min(${READER_CHAT_ROOM.panelHeightRem * scale}rem, ${READER_CHAT_ROOM.panelMaxHeightCss})`
      : "500px";

  return {
    fab: {
      width: options.layout === "reader" ? fabSize : undefined,
      height: options.layout === "reader" ? fabSize : undefined,
      bottom: fabBottom,
      right: fabRight,
    },
    panel: {
      width: panelWidth,
      height: panelHeight,
      bottom: options.layout === "reader" ? fabBottom : "0",
      right: fabRight,
    },
    messageFontSize:
      options.layout === "reader"
        ? readerFullscreen
          ? "1.25rem"
          : windowedReader
            ? "0.875rem"
            : "1rem"
        : undefined,
  };
}

export function isTypingTarget(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (element.isContentEditable) return true;
  return Boolean(element.closest("[contenteditable='true']"));
}
