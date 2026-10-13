import { ThreadMessagePort } from '@quilted/threads';
import {
  CONNECT_MESSAGE_TYPE,
  type AppExports,
  type FetchResponse,
  type HostExports,
  type StartContext,
} from '@tryghost/app-contracts/bridge';
import { vi, type Mock } from 'vitest';

export const ADMIN_ORIGIN = 'https://admin.example';

export function startContext(overrides: Partial<StartContext> = {}): StartContext {
  return {
    site: {
      url: 'https://site.example/',
      title: 'Example',
      timezone: 'Europe/Amsterdam',
      locale: 'en',
    },
    user: { id: '5ddc9141c35e7700383b2937', role: 'Administrator' },
    theme: { mode: 'light', accent_color: '#ff5500' },
    session: { revision: 3 },
    path: '/',
    ...overrides,
  };
}

export interface FakeParent {
  postMessage: Mock<(message: unknown, targetOrigin: string) => void>;
}

/** Puts the page in a frame: `window.parent` becomes a stand-in for Admin's window. */
export function frame(): FakeParent {
  const parent: FakeParent = { postMessage: vi.fn() };
  vi.spyOn(window, 'parent', 'get').mockReturnValue(parent as unknown as Window);
  return parent;
}

/** Delivers a window message the way a browser does, with the fields jsdom leaves out. */
export function postToPage({
  data = { type: CONNECT_MESSAGE_TYPE },
  source = window.parent as unknown,
  origin = ADMIN_ORIGIN,
  ports = [] as MessagePort[],
} = {}) {
  const event = new MessageEvent('message', { data, origin });
  Object.defineProperty(event, 'source', { value: source });
  Object.defineProperty(event, 'ports', { value: ports });
  window.dispatchEvent(event);
}

type HostMocks = { [K in keyof HostExports]: Mock<HostExports[K]> };

export function hostExports(): HostMocks {
  return {
    fetch: vi.fn<HostExports['fetch']>(async (): Promise<FetchResponse> => ({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"posts":[]}',
    })),
    titleChanged: vi.fn<HostExports['titleChanged']>(async () => {}),
    pathChanged: vi.fn<HostExports['pathChanged']>(async () => {}),
    open: vi.fn<HostExports['open']>(async () => {}),
  };
}

/** Admin's side of the channel, over a real `MessageChannel`, as Admin builds it. */
export class FakeAdmin {
  readonly channel = new MessageChannel();
  readonly thread: ThreadMessagePort<AppExports, Partial<HostExports>>;

  constructor(readonly exports: Partial<HostExports> = hostExports()) {
    this.thread = new ThreadMessagePort<AppExports, Partial<HostExports>>(this.channel.port1, {
      exports,
    });
    this.channel.port1.start();
  }

  /** Answers the hello, handing the page its end of the channel. */
  connect(options: { source?: unknown; origin?: string } = {}) {
    postToPage({ ...options, ports: [this.channel.port2] });
  }

  start(context: unknown = startContext()) {
    return this.thread.imports.start(context as StartContext);
  }

  close() {
    this.thread.close();
    this.channel.port1.close();
  }
}

/** Waits for messages in flight on the channel to land. */
export function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
}
