// account.ghost.org's Connect page sends the admin to
// #/settings/stripe-connect?secure_key=… once Stripe is connected. The key
// holds the connected account's secret key, so it leaves the address before
// anything can record it (Sentry's history breadcrumbs, the router, the
// sign-in redirect) and is kept only in memory until the Stripe modal takes it.
let deliveredKey = '';

// Set when the admin clicks Connect with Stripe in this tab. A delivered key
// is saved without asking only in the tab that started the connection: a key
// in a link from anywhere else could name someone else's Stripe account.
const STARTED_PROP = 'ghost-stripe-connect-started';
// As long as the connection's state is accepted.
const STARTED_MAX_AGE_MS = 60 * 60 * 1000;

/** Takes `secure_key` out of the address. Runs before the router and Sentry start. */
export function captureDeliveredSecureKey() {
  const { hash } = window.location;
  const queryStart = hash.indexOf('?');
  if (queryStart === -1 || hash.slice(0, queryStart) !== '#/settings/stripe-connect') {
    return;
  }
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  const key = params.get('secure_key');
  if (!key) {
    return;
  }
  params.delete('secure_key');
  const query = params.toString();
  const url = new URL(window.location.href);
  url.hash = query ? `${hash.slice(0, queryStart)}?${query}` : hash.slice(0, queryStart);
  window.history.replaceState(window.history.state, '', url);
  deliveredKey = key;
}

export function deliveredSecureKey() {
  return deliveredKey;
}

/** Whether the admin started a Stripe connection in this tab, recently enough. */
export function connectionStartedHere() {
  try {
    const startedAt = Number(sessionStorage.getItem(STARTED_PROP));
    return startedAt > 0 && Date.now() - startedAt < STARTED_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function markConnectionStarted() {
  try {
    sessionStorage.setItem(STARTED_PROP, String(Date.now()));
  } catch {
    // Without storage the delivered key is confirmed before it's saved.
  }
}

/** A delivered key is considered once, by the Stripe modal it arrives for. */
export function forgetDeliveredSecureKey() {
  deliveredKey = '';
  try {
    sessionStorage.removeItem(STARTED_PROP);
  } catch {
    // Nothing to remove.
  }
}

/** The account a delivered key names, for the admin to confirm; null if it isn't a key. */
export function describeSecureKey(
  key: string,
): { name: string; id: string; livemode: boolean } | null {
  try {
    const bytes = Uint8Array.from(atob(key), (char) => char.charCodeAt(0));
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || typeof (data as { i?: unknown }).i !== 'string') {
      return null;
    }
    const { n, i, l } = data as { n?: unknown; i: string; l?: unknown };
    return { name: typeof n === 'string' ? n : '', id: i, livemode: l === true };
  } catch {
    return null;
  }
}
