// The page's own fetch, kept before install.ts wraps it, for handlers that
// need the real backend (reading real tiers, patching the real config).
// eslint-disable-next-line no-restricted-syntax -- prototype-only fake backend: this IS the layer under the API hooks
let realFetch: typeof fetch = (...args) => fetch(...args);

export const setRealFetch = (fn: typeof fetch) => {
  realFetch = fn;
};

export const fetchReal: typeof fetch = (...args) => realFetch(...args);

export const API_ROOT = '/ghost/api/admin';
