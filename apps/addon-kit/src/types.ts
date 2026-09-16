import type { RemoteConnection } from '@remote-dom/core/elements';
import type { ComponentChild } from 'preact';

/**
 * The add-on API version implemented by this host. Calendar-versioned.
 * Manifests declare the api_version they were built against; the host loads
 * add-ons whose api_version is less than or equal to this value.
 */
export const ADDON_API_VERSION = '2026-01';

export const RENDER_TARGETS = ['admin.dashboard.card.render', 'admin.page.render'] as const;

export type AddonRenderTarget = (typeof RENDER_TARGETS)[number];

export const SHOULD_RENDER_TARGETS = [
  'admin.dashboard.card.should-render',
  'admin.page.should-render',
] as const;

export type AddonShouldRenderTarget = (typeof SHOULD_RENDER_TARGETS)[number];

export type AddonTarget = AddonRenderTarget | AddonShouldRenderTarget;

/**
 * Maps a render target to its paired conditional-visibility target.
 */
export const SHOULD_RENDER_PAIRS: Record<AddonRenderTarget, AddonShouldRenderTarget> = {
  'admin.dashboard.card.render': 'admin.dashboard.card.should-render',
  'admin.page.render': 'admin.page.should-render',
};

/**
 * The contextual data passed to an add-on for a target. `context` is
 * target-specific: dashboard cards receive the current analytics range,
 * pages receive the wildcard `path` under `#/apps/:handle/`.
 */
export interface AddonDataEnvelope {
  site: {
    url: string;
    title: string;
  };
  apiVersion: string;
  context: Record<string, unknown>;
}

export interface SerializedRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface SerializedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface AddonGeneratedImage {
  name: string;
  type: string;
  bytes: Uint8Array;
}

export interface AddonAssetReference {
  url: string;
}

export interface AddonEditorSettingsCapabilities {
  fetch(request: SerializedRequest): Promise<SerializedResponse>;
  uploadImage(image: AddonGeneratedImage): Promise<AddonAssetReference>;
}

/**
 * Host-implemented capabilities passed into the sandbox over the thread.
 * Everything is async: there are no synchronous reads of host state.
 */
export interface HostCapabilities {
  showToast(message: string, options?: { type?: 'success' | 'error' }): Promise<void>;
  navigate(path: string): Promise<void>;
  fetch(request: SerializedRequest): Promise<SerializedResponse>;
}

/**
 * The RPC surface the sandbox bootstrap exposes to the host.
 */
export interface SandboxExports {
  /**
   * Fetches an add-on bundle from the provider origin, verifies its
   * integrity hash when one is pinned, and evaluates it. Idempotent per URL.
   */
  loadBundle(options: { url: string; integrity?: string; source?: string }): Promise<void>;

  /**
   * Runs a loaded render module against the remote-dom connection. May only
   * be called once per sandbox instance.
   */
  render(options: {
    bundleUrl: string;
    connection: RemoteConnection;
    data: AddonDataEnvelope;
    capabilities: HostCapabilities;
  }): Promise<void>;

  /**
   * Runs a loaded should-render module and returns its verdict.
   */
  shouldRender(options: {
    bundleUrl: string;
    data: AddonDataEnvelope;
    capabilities: HostCapabilities;
  }): Promise<boolean>;

  /**
   * Runs an editor content module and returns the provider-serialized web
   * and portable snapshots stored by the editor node.
   */
  renderBlock(options: {
    bundleUrl: string;
    request: AddonEditorBlockRequest;
  }): Promise<AddonEditorBlockRenderOutput>;

  /** Renders a block-scoped editor settings tree through remote DOM. */
  renderSettings(options: {
    bundleUrl: string;
    connection: RemoteConnection;
    request: AddonEditorBlockRequest;
    capabilities: AddonEditorSettingsCapabilities;
    proposePatch: (patch: Record<string, unknown>) => Promise<void>;
  }): Promise<void>;

  /** Pushes canonical properties into a mounted settings surface. */
  updateSettingsProps(props: Record<string, unknown>): Promise<void>;

  /**
   * Pushes a new data envelope into the sandbox (e.g. the dashboard range
   * changed, or the page path changed).
   */
  updateData(data: AddonDataEnvelope): Promise<void>;
}

/**
 * The `ghost` bridge object handed to add-on entry modules.
 */
export interface GhostBridge {
  /** Live view of the current data envelope. */
  readonly data: AddonDataEnvelope;
  /** Subscribe to data envelope changes. Returns an unsubscribe function. */
  onDataChange(listener: (data: AddonDataEnvelope) => void): () => void;
  toast: {
    show(message: string, options?: { type?: 'success' | 'error' }): Promise<void>;
  };
  /** Navigate within Ghost Admin (e.g. `/apps/my-addon/settings`). */
  navigate(path: string): Promise<void>;
  /**
   * Host-executed fetch. Reaches the add-on's declared backend origin, or
   * the instance's own Admin API for paths starting with `/ghost/api/admin/`
   * (spike-only passthrough — no compatibility promise; see plan §3).
   */
  fetch(
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ): Promise<Response>;
}

/**
 * The signature of an add-on entry module's default export. Render modules
 * render `gh-*` primitives into `document.body`; should-render modules return
 * a boolean (or a promise of one).
 */
export type AddonModuleFunction = (ghost: GhostBridge) => unknown;

export interface AddonModuleExports {
  default: AddonModuleFunction;
}

export interface AddonEditorBlockRequest {
  blockName: string;
  props: Record<string, unknown>;
  context?: AddonEditorPresentationContext;
}

export interface AddonEditorPresentationContext {
  siteTimezone?: string;
}

export interface AddonEditorComponentOutput {
  /** Required static web representation. */
  content: ComponentChild;
  /** Optional portable representation for email, RSS and other non-web targets. */
  portableContent?: ComponentChild;
  css?: string;
  initialHeight?: number;
}

export type AddonEditorComponentRenderer = (
  request: AddonEditorBlockRequest,
) => AddonEditorComponentOutput | Promise<AddonEditorComponentOutput>;

export interface AddonEditorContentModuleExports {
  default: AddonEditorContentRenderer;
}

export interface AddonEditorContentRenderer {
  (
    request: AddonEditorBlockRequest,
  ): AddonEditorBlockRenderOutput | Promise<AddonEditorBlockRenderOutput>;
  hydrate?(request: AddonEditorBlockRequest, root: Element): void | Promise<void>;
}

export interface AddonEditorSettingsBridge {
  readonly blockName: string;
  readonly props: Record<string, unknown>;
  readonly context?: AddonEditorPresentationContext;
  readonly assets: {
    uploadImage(image: AddonGeneratedImage): Promise<AddonAssetReference>;
  };
  fetch(
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ): Promise<Response>;
  proposePatch(patch: Record<string, unknown>): Promise<void>;
  onPropsChange(listener: (props: Record<string, unknown>) => void): () => void;
}

export interface AddonEditorSettingsModuleExports {
  default(ghost: AddonEditorSettingsBridge): unknown;
}

export interface AddonEditorBlockRenderOutput {
  html: string;
  portableHtml: string;
  css: string;
  initialHeight: number;
}

/**
 * A single targeting entry in an add-on manifest. `bundle` is the URL of the
 * built entry module for the target, resolved relative to the manifest URL.
 */
export interface AddonManifestTargeting {
  target: AddonTarget;
  bundle: string;
  /** Optional sha256 integrity hash for the built bundle (`sha256-<base64>`). */
  integrity?: string;
}

export interface AddonManifestEditorBlock {
  name: string;
  label: string;
  /** Kebab-case semantic icon name. Unknown icons use the host's add-on fallback. */
  icon?: string;
  description?: string;
  keywords?: string[];
  initialProperties?: Record<string, unknown>;
  /** Public resource policy declared at install time, never by render output. */
  resourceOrigins?: string[];
  /** Type-specific public iframe resource policy. Scheme sources such as `https:` may be used. */
  resourcePolicy?: AddonResourcePolicy;
  /** Opts this block into lazy public hydration by the shared content bundle. */
  hydrate?: boolean;
}

export interface AddonResourcePolicy {
  images?: string[];
  media?: string[];
}

export interface AddonManifestEditor {
  blocks: AddonManifestEditorBlock[];
  content: {
    bundle: string;
    integrity?: string;
  };
  settings?: {
    bundle: string;
    integrity?: string;
  };
}

/**
 * The add-on manifest: the install contract. Served as JSON from the
 * provider origin alongside the built bundles.
 */
export interface AddonManifest {
  name: string;
  handle: string;
  version: string;
  api_version: string;
  /** Provider-declared publisher name, shown on install/detail screens (unverified). */
  publisher?: string;
  /** Short description for marketplace and detail screens. */
  description?: string;
  /** Origin of the add-on's own backend, if it has one. */
  backend?: string;
  /** Static sidebar entry metadata — host-rendered, no sandbox involved. */
  sidebar?: {
    label: string;
    icon?: string;
    /** Path under `#/apps/:handle/`, defaults to the root. */
    route?: string;
  };
  /** Static discovery metadata plus the sandboxed content renderer bundle. */
  editor?: AddonManifestEditor;
  targeting: AddonManifestTargeting[];
}

/**
 * The instance-side install record, persisted as a JSON array in the
 * `addons` setting. A list, not a service.
 */
export interface AddonInstallRecord {
  manifestUrl: string;
  handle: string;
  name: string;
  enabled: boolean;
  /** Pinned release: auto-updated to the latest api_version-compatible one. */
  version: string;
  apiVersion: string;
  publisher?: string;
  description?: string;
  backend?: string;
  sidebar?: AddonManifest['sidebar'];
  editor?: {
    blocks: AddonManifestEditorBlock[];
    contentBundleUrl: string;
    integrity?: string;
    settingsBundleUrl?: string;
    settingsIntegrity?: string;
  };
  /** True for dev-manifest loads (localStorage). Transient — never persisted. */
  dev?: boolean;
  targeting: Array<{
    target: AddonTarget;
    /** Absolute bundle URL, resolved at pin time. */
    bundleUrl: string;
    integrity?: string;
  }>;
}
