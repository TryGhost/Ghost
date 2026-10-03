export function transformPortalAnchorToRelative(anchor) {
  const href = anchor.getAttribute('href');
  let url;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    // A malformed theme link must not interrupt Portal initialization.
    return;
  }
  const supportedHashPrefixes = ['#/portal', '#/share'];
  const hasSupportedHashPrefix = supportedHashPrefixes.some((prefix) =>
    url.hash.startsWith(prefix),
  );
  const hasRelativeSupportedHashPrefix = supportedHashPrefixes.some((prefix) =>
    href.startsWith(prefix),
  );

  // ignore non-portal links
  if (!url.hash || !hasSupportedHashPrefix) {
    return;
  }

  // ignore already-relative links
  if (hasRelativeSupportedHashPrefix) {
    return;
  }

  // ignore external links
  if (url.origin !== window.location.origin) {
    return;
  }

  // convert to a relative link
  anchor.setAttribute('href', url.hash);
}
