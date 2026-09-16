/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Request/response ports replacing Express in the ported render pipeline
 * (docs/extraction-map.md §(b)).
 *
 * Inbound: a plain request context derived from a web-standard `Request`.
 * Outbound: a result union instead of `res.render`/`res.redirect`/`next()` —
 * the assembly layer (src/index.ts) converts it into a web-standard `Response`.
 */

/**
 * Mirrors Express `res.locals` at render time (extraction-map §1 `_locals`):
 * `version`, `safeVersion`, `relativeUrl`, `member`, `context`,
 * `_templateOptions` — plus whatever helpers write (`ghostAnalytics`).
 */
export type RenderLocals = Record<string, any>;

/**
 * Mirrors the `res.routerOptions` shapes documented in extraction-map §1.
 */
export interface RouterOptions {
  type: 'collection' | 'channel' | 'entry' | 'custom';
  permalinks?: string;
  resourceType?: string;
  /** Raw QUERY entry (routing/config.ts) the controller dispatches through */
  query?: any;
  context?: string[];
  filter?: string;
  limit?: number;
  order?: string;
  frontPageTemplate?: string;
  templates?: string[];
  identifier?: string;
  name?: string;
  data?: any;
  contentType?: string;
  defaultTemplate?: string;
  slugTemplate?: boolean;
  [key: string]: any;
}

/** Inbound request context (replaces Express `req`). */
export interface PortRequest {
  /** Site-relative pathname (no query), e.g. '/my-post/' */
  path: string;
  /** Path + query string, e.g. '/my-post/?ref=x' */
  originalUrl: string;
  query: Record<string, any>;
  /** Route params filled in by the resolver (page, slug, options) */
  params: Record<string, any>;
  member?: any;
}

/** Outbound response context (replaces Express `res`). */
export interface PortResponse {
  routerOptions: RouterOptions;
  locals: RenderLocals;
  /** Set by rendering/templates.ts setTemplate */
  _template?: string;
}

/**
 * The outbound result union (extraction-map §(b)). `{next: true}` mirrors
 * Express `next()` — fall through to the next route candidate; an exhausted
 * candidate list becomes a 404 Response in the assembly layer.
 */
export type RenderResult =
  | { render: { template: string; data: Record<string, any>; contentType?: string } }
  | { redirect: { status: 301 | 302; url: string; headers?: Record<string, string> } }
  | { next: true }
  | { error: { err: unknown } };
