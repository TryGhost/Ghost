// account.ghost.org's Connect page sends the admin to
// #/settings/stripe-connect?secure_key=… once Stripe is connected. The key
// holds the connected account's secret key, so it leaves the address before
// anything can record it (Sentry's history breadcrumbs, the router, the
// sign-in redirect) and is kept only in memory until the Stripe modal saves it.
let deliveredKey = '';

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

/** The state the key carries is good for one save, so it is dropped once saving starts. */
export function forgetDeliveredSecureKey() {
  deliveredKey = '';
}
