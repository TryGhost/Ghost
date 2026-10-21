/**
 * A fake app page that uses the bridge without the SDK, so it can send Admin things the SDK would
 * refuse to send. Specs that test Admin's own checks frame this page (see `appFramePage` in
 * frames.ts) and call Admin through it with `callHostRaw`. All other specs frame the SDK's page,
 * app-frame-stand-in.ts.
 *
 * The `bundleFrameScript` command bundles it with its dependencies into one module, because the
 * frame can't load anything from the test server. It runs in the frame, so from the workspace it
 * imports only types and the contracts' zod-free root entry point.
 */
import { ThreadMessagePort } from '@quilted/threads';
import { CONNECT_MESSAGE_TYPE, HELLO_MESSAGE_TYPE } from '@tryghost/app-contracts';
import type { AppExports, HostExports } from '@tryghost/app-contracts/bridge';

import type { AppFrameResult } from './app-frame-stand-in';

export interface RawAppFrameHooks {
  /** Calls a host export with arguments as given, unchecked, as a misbehaving app would. */
  call(name: string, args: unknown[]): Promise<AppFrameResult<unknown>>;
}

let host: HostExports | undefined;
let markStarted: () => void = () => {};
// Not resolved with `host` itself. The thread's imports respond to every property name, including
// `then`, so a promise would treat them as a thenable and wait on Admin forever.
const started = new Promise<void>((resolve) => {
  markStarted = resolve;
});

const hooks: RawAppFrameHooks = {
  async call(name, args) {
    await started;
    const calls = host as unknown as Record<string, (...rest: unknown[]) => Promise<unknown>>;
    try {
      // Admin puts the code at the start of the message, as in `invalid_path: …`.
      return { value: await calls[name](...args) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  },
};
(window as unknown as { __app: RawAppFrameHooks }).__app = hooks;

// A random ID for this document, made once as the SDK makes its own.
const documentId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const hello = () =>
  window.parent.postMessage({ type: HELLO_MESSAGE_TYPE, sdk: 'raw', document: documentId }, '*');
const helloTimer = window.setInterval(hello, 250);
hello();

window.addEventListener('message', (event: MessageEvent<{ type?: unknown } | null>) => {
  const [port] = event.ports;
  if (
    host ||
    !port ||
    event.source !== window.parent ||
    event.data?.type !== CONNECT_MESSAGE_TYPE
  ) {
    return;
  }
  window.clearInterval(helloTimer);
  const exports: AppExports = {
    start() {
      markStarted();
      return Promise.resolve();
    },
    themeChanged: () => Promise.resolve(),
    pathChanged: () => Promise.resolve(),
  };
  host = new ThreadMessagePort<HostExports, AppExports>(port, { exports }).imports;
  port.start();
});
