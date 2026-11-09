import {
  CARD_FAILED_MESSAGE_TYPE,
  CARD_INIT_MESSAGE_TYPE,
  CARD_READY_MESSAGE_TYPE,
  CARD_START_GLOBAL,
  CARD_TIMEOUT_MS,
} from '@tryghost/app-contracts/cards';

/** How a card's code runs: in a Worker with no DOM to render, or in a document for its settings. */
export type CardSandboxMode = 'static' | 'interactive';

/**
 * The sandbox document's only rules. Nothing in it can reach the network, and it has no origin of
 * its own, so it can't reach Admin, its cookies or its storage. Code comes in as text, which is why
 * it may evaluate it.
 */
export const CARD_SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'none'",
  'worker-src blob:',
  'img-src data: blob:',
  "style-src 'unsafe-inline'",
  "font-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

const START = JSON.stringify(CARD_START_GLOBAL);

/**
 * The shim Ghost writes into the sandbox. It waits for Admin's one init message, which carries the
 * card's bundle and the channel's port, then starts the bundle on the port: in this document for a
 * settings panel, or in a Worker made from a blob for rendering. The script is in `<head>`, so the
 * body holds only what the card's settings code renders.
 */
export function cardSandboxSrcdoc(mode: CardSandboxMode): string {
  const start =
    mode === 'interactive'
      ? `(0, eval)(data.source); self[${START}](event.ports[0]);`
      : `var source = data.source + '\\nself.addEventListener("message", function init(e) {'
          + 'if (!e.data || e.data.type !== "${CARD_INIT_MESSAGE_TYPE}" || !e.ports[0]) { return; }'
          + 'self.removeEventListener("message", init);'
          + 'try { self[${START.replaceAll('"', '\\"')}](e.ports[0]); self.postMessage({type: "${CARD_READY_MESSAGE_TYPE}"}); }'
          + 'catch (error) { self.postMessage({type: "${CARD_FAILED_MESSAGE_TYPE}", message: String(error && error.message || error)}); }'
          + '});';
        var url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
        var worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.addEventListener('message', function (e) { window.parent.postMessage(e.data, '*'); });
        worker.addEventListener('error', function (e) {
          window.parent.postMessage({type: '${CARD_FAILED_MESSAGE_TYPE}', message: e.message || 'The card failed to start'}, '*');
        });
        worker.postMessage({type: '${CARD_INIT_MESSAGE_TYPE}'}, [event.ports[0]]);`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CARD_SANDBOX_CSP}">
<script>
window.addEventListener('message', function init(event) {
  var data = event.data;
  if (event.source !== window.parent || !data || data.type !== '${CARD_INIT_MESSAGE_TYPE}' || !event.ports || !event.ports[0]) { return; }
  window.removeEventListener('message', init);
  try {
    ${start}
  } catch (error) {
    window.parent.postMessage({type: '${CARD_FAILED_MESSAGE_TYPE}', message: String(error && error.message || error)}, '*');
  }
});
</script></head><body></body></html>`;
}

export interface CardSandbox {
  /** Admin's end of the channel to the card's code. */
  port: MessagePort;
  dispose(): void;
}

/** Rejects after `ms`, so a card that never answers can't hold the editor up. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Starts a card's bundle in a hidden sandbox. The frame is bound by its exact window: an opaque
 * frame's origin is `null`, which every sandbox shares, so it can't be told apart by origin, and
 * the port is posted to `'*'` because an opaque origin can't be named as a target.
 */
export async function startCardSandbox(
  source: string,
  mode: CardSandboxMode,
): Promise<CardSandbox> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.title = 'App card';
  frame.style.display = 'none';
  frame.srcdoc = cardSandboxSrcdoc(mode);

  let disposed = false;
  const channel = new MessageChannel();
  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    channel.port1.close();
    frame.remove();
  };

  try {
    const loaded = new Promise<void>((resolve) => {
      frame.addEventListener('load', () => resolve(), { once: true });
    });
    document.body.append(frame);
    await withTimeout(loaded, CARD_TIMEOUT_MS, 'The card’s sandbox didn’t load');
    const target = frame.contentWindow;
    if (disposed || !target) {
      throw new Error('The card’s sandbox closed while starting');
    }

    let removeListener = () => {};
    const started =
      mode === 'static'
        ? new Promise<void>((resolve, reject) => {
            const onMessage = (event: MessageEvent) => {
              if (event.source !== target) {
                return;
              }
              const data = event.data as { type?: unknown; message?: unknown } | null;
              if (data?.type === CARD_READY_MESSAGE_TYPE) {
                resolve();
              } else if (data?.type === CARD_FAILED_MESSAGE_TYPE) {
                reject(
                  new Error(`The card failed to start: ${String(data.message).slice(0, 300)}`),
                );
              }
            };
            window.addEventListener('message', onMessage);
            removeListener = () => window.removeEventListener('message', onMessage);
          })
        : Promise.resolve();

    // A sandbox can navigate itself, which CSP doesn't stop, and the document it loads is no
    // longer Ghost's shim. A later load ends the sandbox. Known limits of the spike: the request
    // that navigation makes still goes out, and a page that never finishes loading isn't ended,
    // though it has no channel either, as the port stayed with the shim's document.
    frame.addEventListener('load', dispose);

    target.postMessage({ type: CARD_INIT_MESSAGE_TYPE, source, mode }, '*', [channel.port2]);
    try {
      await withTimeout(started, CARD_TIMEOUT_MS, 'The card didn’t start in time');
    } finally {
      removeListener();
    }
    channel.port1.start();
    return { port: channel.port1, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
