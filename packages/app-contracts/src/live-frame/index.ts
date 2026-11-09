/**
 * Live frames: how Ghost's public script and an interactive card's frame talk on the site.
 *
 * The frame is a page on the app's own origin. It speaks first: the SDK posts a hello to its
 * parent, the public script checks the message comes from that exact frame and the card's
 * declared origin, and answers with a `MessagePort`. Calls then go over that port with the same
 * RPC library as every other boundary.
 *
 * This entry point has no dependencies, as it ships in Ghost's public script. The public script
 * checks the one argument it receives by hand.
 */

export const LIVE_FRAME_HELLO_TYPE = 'ghost-card-frame:hello';
export const LIVE_FRAME_CONNECT_TYPE = 'ghost-card-frame:connect';

/** How long a live frame has from loading to starting, in milliseconds, before the snapshot stays. */
export const LIVE_FRAME_TIMEOUT_MS = 10_000;

export const LIVE_FRAME_HEIGHT_MIN = 20;
export const LIVE_FRAME_HEIGHT_MAX = 4000;

/** What the public script tells a live frame when it starts. Never the reader's identity. */
export interface LiveFrameContext {
  card: string;
  /** Only the properties the card's render listed as public. */
  properties: Record<string, unknown>;
  site: { url: string; locale: string };
  theme: { mode: 'light' | 'dark'; accent_color: string; font_family: string };
}

/** What the public script offers a live frame. */
export interface LiveFrameHostExports {
  /** Asks for the frame to be this tall, in CSS pixels. */
  resize(height: number): Promise<void>;
}

/** What a live frame exposes to the public script, through the SDK. */
export interface LiveFrameExports {
  /** Starts the frame. The public script swaps the snapshot for the frame once this resolves. */
  start(context: LiveFrameContext): Promise<void>;
}

export interface LiveFrameHello {
  type: typeof LIVE_FRAME_HELLO_TYPE;
}

export interface LiveFrameConnect {
  type: typeof LIVE_FRAME_CONNECT_TYPE;
}

/** Whether a height a frame asks for is one the public script accepts. */
export function isLiveFrameHeight(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= LIVE_FRAME_HEIGHT_MIN &&
    value <= LIVE_FRAME_HEIGHT_MAX
  );
}
