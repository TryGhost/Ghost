/**
 * Instance-config scraping — the config values the Content API cannot supply
 * (docs/deltas.md rows 1 + 3), recovered from a live page's rendered HTML.
 *
 * PROVENANCE: moved from test/integration/harness.ts (which now re-exports
 * from here) so the standalone Admin Builder can share the exact same regexes
 * instead of duplicating them: the byte-parity suite, fixture recorder, and
 * Builder must never drift apart on what "fully configured" means.
 *
 * Exported from the `@tryghost/theme-renderer/editor/instance-config` subpath
 * — editor-side bootstrap tooling, not part of the render contract.
 */

export interface InstanceConfigScrape {
  /** Per-boot asset hash from any `?v=<hash>` on a built asset URL */
  assetHash?: string;
  /** Portal script URL (data-i18n is portal-specific — see getMembersHelper) */
  portalUrl?: string;
  /** Sodo-search script URL + styles (data-sodo-search is search-specific) */
  sodoSearch?: { url: string; styles: string };
  /**
   * Comments-ui script URL (data-ghost-comments is comments-specific). Only
   * present when the scraped page carries the tag — i.e. a POST page with
   * comments enabled; deliberately NOT in `missing`, since most pages
   * legitimately lack it. Without it `{{comments}}` renders nothing
   * (deltas.md row 13).
   */
  commentsUrl?: string;
  /** Names of scrapes that found nothing — non-empty means degraded config */
  missing: string[];
  /** Ready-to-pass `createRenderer({config})` shape for whatever was found */
  config: Record<string, unknown>;
}

export function scrapeInstanceConfig(liveHomeHtml: string): InstanceConfigScrape {
  const assetHash = liveHomeHtml.match(/\?v=([A-Za-z0-9_-]+)"/)?.[1];
  const assetHashes = Object.fromEntries(
    [
      ...liveHomeHtml.matchAll(/\b(?:href|src)=["']([^"']+\?v=([A-Za-z0-9_-]+)(?:#[^"']*)?)["']/g),
    ].flatMap((match) => {
      try {
        const pathname = new URL(match[1]!, 'https://renderer.invalid').pathname;
        return /\/(?:assets|public)\//.test(pathname) ? [[pathname, match[2]!]] : [];
      } catch {
        return [];
      }
    }),
  );
  const portalUrl = liveHomeHtml.match(/<script defer src="([^"]+)" data-i18n=/)?.[1];
  const sodoSearchMatch = liveHomeHtml.match(
    /<script defer src="([^"]+)" data-key="[^"]*" data-styles="([^"]*)" data-sodo-search=/,
  );
  const sodoSearch = sodoSearchMatch
    ? { url: sodoSearchMatch[1]!, styles: sodoSearchMatch[2]! }
    : undefined;
  const commentsUrl = liveHomeHtml.match(
    /<script defer src="([^"]+)" data-locale="[^"]*" data-ghost-comments=/,
  )?.[1];

  const missing: string[] = [];
  if (!assetHash) {
    missing.push('assetHash (?v= on a built asset URL)');
  }
  if (!portalUrl) {
    missing.push('portal script tag');
  }
  if (!sodoSearch) {
    missing.push('sodo-search script tag');
  }

  return {
    assetHash,
    portalUrl,
    sodoSearch,
    commentsUrl,
    missing,
    config: {
      // deltas.md #1 — the live per-boot hash (upstream: config assetHash
      // wins over the boot-time md5 in getGlobalAssetHash)
      ...(assetHash && { assetHash }),
      ...(Object.keys(assetHashes).length > 0 && { assetHashes }),
      // deltas.md #3 — frontend-app instance config (Ghost server
      // config keys, extraction-map §6)
      ...(portalUrl && { portal: { url: portalUrl } }),
      ...(sodoSearch && { sodoSearch }),
      ...(commentsUrl && { comments: { url: commentsUrl } }),
    },
  };
}

/**
 * Content API key scraped from a `data-key="<hex>"` attribute (portal /
 * sodo-search script tags render it on every themed page). Same pattern the
 * integration harness has always used; the editor uses it as the fallback
 * when its own config doesn't carry the key.
 */
export function scrapeContentApiKey(liveHtml: string): string | null {
  return liveHtml.match(/data-key="([a-f0-9]+)"/)?.[1] ?? null;
}
