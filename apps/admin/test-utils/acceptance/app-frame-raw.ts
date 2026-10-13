/**
 * The page of an app that speaks the bridge without the SDK, so that it can send Admin
 * what the SDK would refuse to: specs that assert Admin's own checks frame it (see
 * `appFramePage` in frames.ts) and call Admin through it with `callHostRaw`. Everything
 * else frames the SDK's page, app-frame-stand-in.ts.
 *
 * Bundled with its dependencies into one module by the `bundleFrameScript` command, as the
 * frame can load nothing from the test server. It runs in the frame, so it imports only
 * types from the workspace.
 */
import { ThreadMessagePort } from '@quilted/threads';
import type { AppExports, HostExports } from '@tryghost/app-contracts/bridge';

import type { AppFrameResult } from './app-frame-stand-in';

export interface RawAppFrameHooks {
  /** Calls a host export with arguments as given, unchecked, as a misbehaving app would. */
  call(name: string, args: unknown[]): Promise<AppFrameResult<unknown>>;
}

let host: HostExports | undefined;
let markStarted: () => void = () => {};
// Not resolved with `host` itself: the thread's imports answer every property, `then`
// included, so a promise would take them for a thenable and wait on Admin forever.
const started = new Promise<void>((resolve) => {
  markStarted = resolve;
});

const hooks: RawAppFrameHooks = {
  async call(name, args) {
    await started;
    const calls = host as unknown as Record<string, (...rest: unknown[]) => Promise<unknown>>;
    try {
      // Admin leads the message with the code, as in `invalid_path: …`.
      return { value: await calls[name](...args) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  },
};
(window as unknown as { __app: RawAppFrameHooks }).__app = hooks;

const hello = () => window.parent.postMessage({ type: 'ghost-app:hello', sdk: 'raw' }, '*');
const helloTimer = window.setInterval(hello, 250);
hello();

window.addEventListener('message', (event: MessageEvent<{ type?: unknown } | null>) => {
  const [port] = event.ports;
  if (host || !port || event.source !== window.parent || event.data?.type !== 'ghost-app:connect') {
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
