import {fetch} from 'cross-fetch';

// TODO: remove this once we're switched `jest` to `vi` in code
// eslint-disable-next-line no-undef
globalThis.jest = vi;

// eslint-disable-next-line no-undef
globalThis.fetch = fetch;
