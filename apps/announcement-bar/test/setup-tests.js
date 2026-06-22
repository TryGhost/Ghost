import {fetch} from 'cross-fetch';

// TODO: remove this once we're switched `jest` to `vi` in code
globalThis.jest = vi;

globalThis.fetch = fetch;
