/**
 * A card's live frame: the page on the app's own origin that an interactive card swaps in on
 * the site, once Ghost's public script has started it.
 *
 * ```ts
 * import { connectLiveFrame } from '@tryghost/app-sdk/live-frame';
 *
 * connectLiveFrame({
 *   start(context) {
 *     renderPlayer(context.properties);
 *   },
 * });
 * ```
 *
 * The frame gets the card's public properties and the site's theme, never anything about the
 * reader. Ghost shows the frame once `start` has resolved, and keeps the card's snapshot if it
 * doesn't within ten seconds.
 */
import { ThreadMessagePort } from '@quilted/threads';
import {
  LIVE_FRAME_CONNECT_TYPE,
  LIVE_FRAME_HEIGHT_MAX,
  LIVE_FRAME_HEIGHT_MIN,
  LIVE_FRAME_HELLO_TYPE,
  type LiveFrameContext,
  type LiveFrameExports,
  type LiveFrameHostExports,
} from '@tryghost/app-contracts/live-frame';

export type { LiveFrameContext } from '@tryghost/app-contracts/live-frame';

export interface LiveFrameOptions {
  /** Shows the card. The frame is swapped in once this resolves. */
  start(context: LiveFrameContext): void | Promise<void>;
  /** Reports the page's height as it changes. On by default. */
  autoResize?: boolean;
}

export interface LiveFrame {
  /** Resolves with the context once the page has started the frame. */
  readonly started: Promise<LiveFrameContext>;
  /** Asks for the frame to be this tall, in CSS pixels. */
  resize(height: number): Promise<void>;
}

const HELLO_INTERVAL = 250;

/** Connects the live frame to the page that shows it, and starts it once the page asks. */
export function connectLiveFrame({ start, autoResize = true }: LiveFrameOptions): LiveFrame {
  let host: LiveFrameHostExports | undefined;
  let resolveStarted!: (context: LiveFrameContext) => void;
  let rejectStarted!: (error: unknown) => void;
  const started = new Promise<LiveFrameContext>((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });
  started.catch(() => {});

  const clamp = (height: number) =>
    Math.min(LIVE_FRAME_HEIGHT_MAX, Math.max(LIVE_FRAME_HEIGHT_MIN, Math.ceil(height)));

  const resize = async (height: number) => {
    await host?.resize(clamp(height));
  };

  if (window.parent === window) {
    rejectStarted(new Error('This live frame is not shown on a Ghost site'));
    return { started, resize };
  }

  const parent = window.parent;
  const onMessage = (event: MessageEvent) => {
    const port = event.ports?.[0];
    if (event.source !== parent || event.data?.type !== LIVE_FRAME_CONNECT_TYPE || !port) {
      return;
    }
    clearInterval(timer);
    window.removeEventListener('message', onMessage);

    const exports: LiveFrameExports = {
      async start(context) {
        await start(context);
        resolveStarted(context);
        if (autoResize && typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            resize(document.documentElement.getBoundingClientRect().height).catch(() => {});
          });
          observer.observe(document.documentElement);
        }
      },
    };
    const thread = new ThreadMessagePort<LiveFrameHostExports, LiveFrameExports>(port, { exports });
    host = thread.imports;
    port.start();
  };

  window.addEventListener('message', onMessage);
  // The hello grants nothing: the port comes the other way, and the page checks this frame's
  // origin before it answers.
  const hello = () => parent.postMessage({ type: LIVE_FRAME_HELLO_TYPE }, '*');
  hello();
  const timer = setInterval(hello, HELLO_INTERVAL);

  return { started, resize };
}
