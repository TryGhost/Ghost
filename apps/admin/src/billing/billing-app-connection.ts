const LOAD_TIMEOUT_MS = 10_000;
const LOAD_RETRY_DELAYS_MS = [1_000];

type AttemptSource = 'preload' | 'user_open' | 'retry';

export interface BillingAppConnectionSnapshot {
  /** The billing app reported `billingAppReady` for the current iframe load. */
  loaded: boolean;
  /** Loading failed after every retry while the billing screen was showing. */
  failed: boolean;
}

/** A visible load failure, in the shape Ember's billing monitor reports to Sentry. */
export interface BillingAppLoadFailureReport {
  billingMonitor: Record<string, unknown>;
  tags: Record<string, string | null>;
}

interface PreloadFailure {
  attemptId: string | null;
  attempts: number;
  elapsedMs: number | null;
  nonReadyMessageCount: number;
  nonReadyMessageTypes: string[];
  lastNonReadyMessageType: string | null;
}

interface BillingAppConnectionOptions {
  /** The billing route the iframe should load for the Admin URL, e.g. `/domain`, or null. */
  getLocationSubRoute: () => string | null;
  /** Admin state the load-failure report records. */
  getReportContext: () => { isForceUpgrade: boolean; routeName: string };
  onLoadFailure: (report: BillingAppLoadFailureReport) => void;
  loadTimeoutMs?: number;
  loadRetryDelaysMs?: number[];
}

// '/' and no destination both load the billing app root
function normalizeSubRoute(subRoute: string | null): string | null {
  return subRoute === '/' ? null : subRoute;
}

function messageType(data: Record<string, unknown>): string {
  if (typeof data.request === 'string' && data.request) {
    return data.request;
  }
  if (data.route) {
    return 'route';
  }
  if (data.subscription) {
    return 'subscription';
  }
  if (typeof data.query === 'string' && data.query) {
    return data.query;
  }
  return 'unknown';
}

/**
 * The connection to the billing app iframe, which stays mounted (hidden) on
 * every Admin page so its subscription reports reach the whole admin. Owns
 * the iframe's src, the load monitor (a timeout, one retry, then a visible
 * failure, reported with Ember's diagnostics), and queued billing app routes.
 */
export class BillingAppConnection {
  private readonly billingUrl: string;
  private readonly options: BillingAppConnectionOptions;
  private readonly loadTimeoutMs: number;
  private readonly loadRetryDelaysMs: number[];

  private iframe: HTMLIFrameElement | null = null;
  private loadListenerAttachedTo: HTMLIFrameElement | null = null;
  private visible = false;
  private loaded = false;
  private failed = false;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private srcSubRoute: string | null = null;
  private pendingSubRoute: string | null = null;
  // The iframe src came from the billing route the Admin URL showed at load
  private srcClaimsLocation = false;

  private attempts = 0;
  private attemptSequence = 0;
  private attemptId: string | null = null;
  private attemptSource: AttemptSource = 'preload';
  private reloadReason: string | null = null;
  private srcSetAt: number | null = null;
  private iframeLoadFired = false;
  private readyReceived = false;
  private preReadyMessageCount = 0;
  private preReadyMessageTypes: string[] = [];
  private lastPreReadyMessageType: string | null = null;
  private preloadFailure: PreloadFailure | null = null;

  private snapshot: BillingAppConnectionSnapshot = { loaded: false, failed: false };
  private readonly listeners = new Set<() => void>();

  constructor(billingUrl: string, options: BillingAppConnectionOptions) {
    this.billingUrl = billingUrl;
    this.options = options;
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
    this.setIframeSrc({ source: 'preload', reloadReason: 'set_src' });
    this.startLoadMonitor('preload');

    return () => {
      this.clearLoadMonitor();
      this.attempts = 0;
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

    // The first route the screen asks for after a cold deep link is the one the
    // iframe is already loading: Ember queues it before its iframe exists and
    // never sends it again, which would override the app's own first redirect
    const claimed =
      this.srcClaimsLocation && normalizeSubRoute(subRoute) === normalizeSubRoute(this.srcSubRoute);
    this.srcClaimsLocation = false;
    if (claimed) {
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
    this.preloadFailure = null;
    this.readyReceived = true;
    this.clearLoadMonitor();
    this.emit();

    if (this.pendingSubRoute) {
      const subRoute = this.pendingSubRoute;
      this.pendingSubRoute = null;
      this.navigateToSubRoute(subRoute);
    }
  }

  /** Records a message that arrived before `billingAppReady`, for the failure report. */
  recordPreReadyMessage(data: Record<string, unknown>): void {
    if (this.loaded || this.readyReceived || this.failed) {
      return;
    }
    if (!this.loadTimeout && !this.retryTimeout) {
      return;
    }

    const type = messageType(data);
    this.preReadyMessageCount += 1;
    this.lastPreReadyMessageType = type;
    if (!this.preReadyMessageTypes.includes(type)) {
      this.preReadyMessageTypes = [...this.preReadyMessageTypes, type];
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
      if (this.attemptId) {
        billingUrl.searchParams.set('bmaAttemptId', this.attemptId);
      }
      return billingUrl.toString();
    } catch {
      return url;
    }
  }

  private resetDiagnostics(): void {
    this.preReadyMessageCount = 0;
    this.preReadyMessageTypes = [];
    this.lastPreReadyMessageType = null;
    this.readyReceived = false;
  }

  private setIframeSrc({
    source,
    reloadReason,
  }: {
    source: AttemptSource;
    reloadReason: string;
  }): void {
    const iframe = this.iframe;
    if (!iframe) {
      return;
    }

    if (this.loadListenerAttachedTo !== iframe) {
      iframe.addEventListener?.('load', () => {
        this.iframeLoadFired = true;
      });
      this.loadListenerAttachedTo = iframe;
    }

    this.attemptSequence += 1;
    this.attemptId = `${Date.now()}-${this.attemptSequence}`;
    this.attemptSource = source;
    this.reloadReason = reloadReason;
    this.iframeLoadFired = false;
    this.srcSetAt = Date.now();
    this.resetDiagnostics();

    const fromLocation = this.pendingSubRoute === null;
    const subRoute = this.pendingSubRoute ?? this.options.getLocationSubRoute();
    this.srcClaimsLocation = fromLocation && subRoute !== null;
    iframe.src = this.iframeUrl(subRoute);
    this.srcSubRoute = subRoute;
    this.pendingSubRoute = null;
  }

  private reloadIframe(options: { source: AttemptSource; reloadReason: string }): void {
    if (!this.loaded) {
      this.setIframeSrc(options);
    }
  }

  private startLoadMonitor(source: AttemptSource): void {
    if (this.loadTimeout || this.retryTimeout) {
      this.attemptSource = source;
      return;
    }

    if (this.failed) {
      this.failed = false;
      this.attempts = 0;
      this.resetDiagnostics();
      this.emit();
    }

    this.attemptSource = source;
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
        const source = this.visible ? 'retry' : this.attemptSource;
        this.reloadIframe({ source, reloadReason: 'timeout_retry' });
        this.startLoadMonitor(source);
      }, retryDelay);
      return;
    }

    this.reportLoadFailure();
  }

  private reportLoadFailure(): void {
    if (this.failed) {
      return;
    }

    if (!this.visible) {
      // retried when the screen opens
      this.preloadFailure = {
        attemptId: this.attemptId,
        attempts: this.attempts,
        elapsedMs: this.srcSetAt ? Date.now() - this.srcSetAt : null,
        nonReadyMessageCount: this.preReadyMessageCount,
        nonReadyMessageTypes: [...this.preReadyMessageTypes],
        lastNonReadyMessageType: this.lastPreReadyMessageType,
      };
      return;
    }

    this.failed = true;
    this.emit();
    this.options.onLoadFailure(this.loadFailureReport());
  }

  private loadFailureReport(): BillingAppLoadFailureReport {
    const iframe = this.iframe;
    const { isForceUpgrade, routeName } = this.options.getReportContext();
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection;

    let bmaBootAccessible = false;
    let bmaBootHasMarkReady = false;
    let bmaBootThrew = false;
    try {
      const bootObj = (iframe?.contentWindow as (Window & { __bmaBoot?: unknown }) | null)
        ?.__bmaBoot as { markReady?: unknown } | undefined;
      bmaBootAccessible = bootObj !== undefined && bootObj !== null;
      bmaBootHasMarkReady = typeof bootObj?.markReady === 'function';
    } catch {
      // cross-origin access throws — capturing that is itself a signal
      bmaBootThrew = true;
    }

    let computedDisplay: string | null = null;
    let computedVisibility: string | null = null;
    let rectWidth: number | null = null;
    let rectHeight: number | null = null;
    if (iframe) {
      try {
        const computed = window.getComputedStyle(iframe);
        computedDisplay = computed.display;
        computedVisibility = computed.visibility;
        const rect = iframe.getBoundingClientRect();
        rectWidth = rect.width;
        rectHeight = rect.height;
      } catch {
        // diagnostic collection must never throw
      }
    }

    // Fields stay flat: Sentry's default normalizeDepth of 3 drops anything deeper
    return {
      billingMonitor: {
        attempts: this.attempts,
        attempt_id: this.attemptId,
        attempt_source: this.attemptSource,
        attempt_phase: 'shell_ready',
        iframe_reload_reason: this.reloadReason,
        has_billing_url: Boolean(this.billingUrl),
        is_force_upgrade: isForceUpgrade,
        location_hash: window.location.hash,
        retry_delays_ms: this.loadRetryDelaysMs,
        iframe_src: iframe?.src || null,
        configured_billing_origin: this.origin,
        document_visibility_state: document.visibilityState,
        iframe_offset_parent_visible: iframe ? iframe.offsetParent !== null : null,
        iframe_computed_display: computedDisplay,
        iframe_computed_visibility: computedVisibility,
        iframe_rect_width: rectWidth,
        iframe_rect_height: rectHeight,
        iframe_load_fired: this.iframeLoadFired,
        ms_since_src_set: this.srcSetAt ? Date.now() - this.srcSetAt : null,
        non_ready_message_count: this.preReadyMessageCount,
        non_ready_message_types: this.preReadyMessageTypes.join(','),
        last_non_ready_message_type: this.lastPreReadyMessageType,
        has_preload_failure: Boolean(this.preloadFailure),
        preload_failure_elapsed_ms: this.preloadFailure?.elapsedMs ?? null,
        preload_non_ready_message_count: this.preloadFailure?.nonReadyMessageCount ?? null,
        preload_non_ready_message_types:
          this.preloadFailure?.nonReadyMessageTypes.join(',') ?? null,
        preload_last_non_ready_message_type: this.preloadFailure?.lastNonReadyMessageType ?? null,
        ready_received: false,
        navigator_online: navigator.onLine,
        connection_effective_type: connection?.effectiveType ?? null,
        bma_boot_accessible: bmaBootAccessible,
        bma_boot_has_mark_ready: bmaBootHasMarkReady,
        bma_boot_threw: bmaBootThrew,
        billing_window_open: this.visible,
      },
      tags: {
        source: 'billing-app-load-monitor',
        billing_shell: 'react',
        attempt_source: this.attemptSource,
        attempt_phase: 'shell_ready',
        route: routeName,
        path: window.location.hash,
      },
    };
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

    const hadPreloadFailure = Boolean(this.preloadFailure);
    const hadVisibleFailure = this.failed;
    const pendingSubRouteNeedsReload =
      Boolean(this.pendingSubRoute) &&
      normalizeSubRoute(this.pendingSubRoute) !== normalizeSubRoute(this.srcSubRoute);

    this.failed = false;
    this.attempts = 0;
    this.clearLoadMonitor();
    this.emit();

    if (hadPreloadFailure || hadVisibleFailure || pendingSubRouteNeedsReload) {
      let reloadReason = 'visible_open_with_destination_route';
      if (hadPreloadFailure) {
        reloadReason = 'visible_open_after_preload_failure';
      } else if (hadVisibleFailure) {
        reloadReason = 'visible_open_after_load_failure';
      }
      this.reloadIframe({ source: 'user_open', reloadReason });
    } else {
      this.attemptSource = 'user_open';
    }

    this.startLoadMonitor('user_open');
  }
}
