const LOAD_TIMEOUT_MS = 10_000;
const LOAD_RETRY_DELAYS_MS = [1_000];

export interface BillingAppConnectionSnapshot {
  /** The billing app reported `billingAppReady` for the current iframe load. */
  loaded: boolean;
  /** Loading failed after every retry while the billing screen was showing. */
  failed: boolean;
}

interface BillingAppConnectionOptions {
  /** The billing route the Admin URL currently shows, e.g. `/domain`, or null. */
  getLocationSubRoute: () => string | null;
  loadTimeoutMs?: number;
  loadRetryDelaysMs?: number[];
}

// '/' and no destination both load the billing app root
function normalizeSubRoute(subRoute: string | null): string | null {
  return subRoute === '/' ? null : subRoute;
}

/**
 * The connection to the billing app iframe, which stays mounted (hidden) on
 * every Admin page so its subscription reports reach the whole admin. Owns
 * the iframe's src, the load monitor (a timeout, one retry, then a visible
 * failure), and queued billing app routes.
 */
export class BillingAppConnection {
  private readonly billingUrl: string;
  private readonly getLocationSubRoute: () => string | null;
  private readonly loadTimeoutMs: number;
  private readonly loadRetryDelaysMs: number[];

  private iframe: HTMLIFrameElement | null = null;
  private visible = false;
  private loaded = false;
  private failed = false;
  private preloadFailed = false;
  private attempts = 0;
  private attemptSequence = 0;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private srcSubRoute: string | null = null;
  private pendingSubRoute: string | null = null;

  private snapshot: BillingAppConnectionSnapshot = { loaded: false, failed: false };
  private readonly listeners = new Set<() => void>();

  constructor(billingUrl: string, options: BillingAppConnectionOptions) {
    this.billingUrl = billingUrl;
    this.getLocationSubRoute = options.getLocationSubRoute;
    this.loadTimeoutMs = options.loadTimeoutMs ?? LOAD_TIMEOUT_MS;
    this.loadRetryDelaysMs = options.loadRetryDelaysMs ?? LOAD_RETRY_DELAYS_MS;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): BillingAppConnectionSnapshot => this.snapshot;

  get origin(): string | null {
    try {
      return new URL(this.billingUrl).origin;
    } catch {
      return null;
    }
  }

  /** Starts loading the billing app into `iframe`; the returned cleanup stops the monitor. */
  attach(iframe: HTMLIFrameElement): () => void {
    this.iframe = iframe;
    this.setIframeSrc();
    this.startLoadMonitor();

    return () => {
      this.clearLoadMonitor();
      this.iframe = null;
    };
  }

  /** Shows or hides the billing screen. Opening makes sure the app is loading. */
  setVisible(visible: boolean): void {
    if (visible === this.visible) {
      return;
    }

    this.visible = visible;

    if (visible) {
      this.ensureReadyForVisibleUse();
      this.post({ query: 'limitUpdate' });
    } else {
      // a stale queued route must not hijack a later plain /pro open
      this.pendingSubRoute = null;
    }
  }

  /** Sends the billing app to `subRoute`, queuing it until the app is ready. */
  navigateToSubRoute(subRoute: string | null): void {
    if (!subRoute) {
      return;
    }

    if (this.loaded && this.post({ query: 'routeUpdate', response: subRoute })) {
      return;
    }

    this.pendingSubRoute = subRoute;

    // Bake the destination into the iframe URL while the screen is showing:
    // a post-load route update can lose a race with the app's own redirects
    if (this.visible && !this.loaded) {
      this.ensureReadyForVisibleUse();
    }
  }

  markLoaded(): void {
    this.loaded = true;
    this.failed = false;
    this.preloadFailed = false;
    this.clearLoadMonitor();
    this.emit();

    if (this.pendingSubRoute) {
      const subRoute = this.pendingSubRoute;
      this.pendingSubRoute = null;
      this.navigateToSubRoute(subRoute);
    }
  }

  /** Only messages from the billing iframe's own window and origin are trusted. */
  isFromBillingApp(event: MessageEvent): boolean {
    const origin = this.origin;
    const frameWindow = this.iframe?.contentWindow;

    return (
      Boolean(event.data) &&
      Boolean(origin) &&
      event.origin === origin &&
      Boolean(frameWindow) &&
      event.source === frameWindow
    );
  }

  post(message: unknown): boolean {
    const frameWindow = this.iframe?.contentWindow;
    const origin = this.origin;

    if (!frameWindow || !origin) {
      return false;
    }

    frameWindow.postMessage(message, origin);
    return true;
  }

  private emit(): void {
    const { loaded, failed } = this;
    if (loaded !== this.snapshot.loaded || failed !== this.snapshot.failed) {
      this.snapshot = { loaded, failed };
      this.listeners.forEach((listener) => listener());
    }
  }

  private iframeUrl(subRoute: string | null): string {
    let url = this.billingUrl;

    if (subRoute) {
      url = url.replace(/\/$/, '') + subRoute;
    }

    try {
      const billingUrl = new URL(url);
      billingUrl.searchParams.set('bmaAttemptId', `${Date.now()}-${this.attemptSequence}`);
      return billingUrl.toString();
    } catch {
      return url;
    }
  }

  private setIframeSrc(): void {
    if (!this.iframe) {
      return;
    }

    const subRoute = this.pendingSubRoute ?? this.getLocationSubRoute();
    this.attemptSequence += 1;
    this.iframe.src = this.iframeUrl(subRoute);
    this.srcSubRoute = subRoute;
    this.pendingSubRoute = null;
  }

  private reloadIframe(): void {
    if (!this.loaded) {
      this.setIframeSrc();
    }
  }

  private startLoadMonitor(): void {
    if (this.loadTimeout || this.retryTimeout) {
      return;
    }

    if (this.failed) {
      this.failed = false;
      this.attempts = 0;
      this.emit();
    }

    this.attempts += 1;
    this.loadTimeout = setTimeout(() => {
      this.loadTimeout = null;
      this.handleLoadTimeout();
    }, this.loadTimeoutMs);
  }

  private handleLoadTimeout(): void {
    const retryDelay = this.loadRetryDelaysMs[this.attempts - 1];

    if (retryDelay !== undefined) {
      this.retryTimeout = setTimeout(() => {
        this.retryTimeout = null;
        this.reloadIframe();
        this.startLoadMonitor();
      }, retryDelay);
      return;
    }

    if (!this.visible) {
      // retried when the screen opens
      this.preloadFailed = true;
      return;
    }

    this.failed = true;
    this.emit();
  }

  private clearLoadMonitor(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private ensureReadyForVisibleUse(): void {
    if (this.loaded) {
      return;
    }

    const hadFailure = this.preloadFailed || this.failed;
    const pendingSubRouteNeedsReload =
      Boolean(this.pendingSubRoute) &&
      normalizeSubRoute(this.pendingSubRoute) !== normalizeSubRoute(this.srcSubRoute);

    this.failed = false;
    this.preloadFailed = false;
    this.attempts = 0;
    this.clearLoadMonitor();
    this.emit();

    if (hadFailure || pendingSubRouteNeedsReload) {
      this.reloadIframe();
    }

    this.startLoadMonitor();
  }
}
