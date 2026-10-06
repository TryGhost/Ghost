/**
 * A minimal app-side client for the Admin bridge (the SDK in BER-3991 will
 * replace this). Requests go to the parent frame; replies are only accepted
 * from it.
 */
export interface GhostContext {
  site: { title: string; url: string };
  user: { name: string; email: string };
  theme: 'light' | 'dark';
  /** The app's own page Ghost has open, e.g. `/` or `/week?date=2026-10-01`. */
  route: string;
}

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const REQUEST_TIMEOUT_MS = 10000;

class GhostAppClient {
  private pending = new Map<string, Pending>();
  private contextListeners = new Set<(context: GhostContext) => void>();
  private adminOrigin = '*';

  constructor() {
    window.addEventListener('message', this.onMessage);
  }

  private onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) {
      return;
    }
    const data = event.data as Record<string, unknown> | null;
    if (!data || data.source !== 'ghost-admin') {
      return;
    }
    this.adminOrigin = event.origin;

    if (data.event === 'context') {
      this.contextListeners.forEach((listener) => listener(data.data as GhostContext));
      return;
    }

    const pending = typeof data.id === 'string' ? this.pending.get(data.id) : undefined;
    if (!pending) {
      return;
    }
    this.pending.delete(data.id as string);
    if (data.ok) {
      pending.resolve(data.result);
    } else {
      pending.reject(new Error(String(data.error ?? 'Request failed')));
    }
  };

  private request<T>(op: string, payload?: unknown): Promise<T> {
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Ghost didn’t respond'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          window.clearTimeout(timer);
          reject(error);
        },
      });
      window.parent.postMessage({ source: 'ghost-app', id, op, payload }, this.adminOrigin);
    });
  }

  /** Tells Admin the app has loaded, and returns where it's running. */
  ready() {
    return this.request<GhostContext>('ready');
  }

  onContextChange(listener: (context: GhostContext) => void) {
    this.contextListeners.add(listener);
    return () => this.contextListeners.delete(listener);
  }

  setTitle(title: string) {
    return this.request<void>('setTitle', { title });
  }

  /** Moves the app to one of its own pages; Ghost updates its URL so Back works. */
  setRoute(path: string, { replace = false } = {}) {
    return this.request<void>('setRoute', { path, replace });
  }

  /** Moves the publisher elsewhere in Admin, e.g. `/editor/post/<id>`. */
  navigate(to: string) {
    return this.request<void>('navigate', { to });
  }

  /** Reads from the Admin API through Admin; `path` is relative to the API root. */
  get<T>(path: string) {
    return this.request<T>('api.get', { path });
  }
}

export const ghost = new GhostAppClient();
