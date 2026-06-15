// This module must never import anything that any other chunk also imports —
// a shared module becomes a static chunk import in the entry, which resolves
// against the version-ranged CDN URL and reintroduces the version-skew race
// this bootstrap exists to prevent (enforced by scripts/verify-pinned-dist.mjs).
import {pinAssetVersion} from './asset-base';

window.__superportalAssetUrl = url => pinAssetVersion(url, SUPERPORTAL_VERSION);

const shellUrl = new URL('./chunks/shell.min.js', pinAssetVersion(import.meta.url, SUPERPORTAL_VERSION)).href;

void import(/* @vite-ignore */ shellUrl).catch((err: unknown) => {
    console.error('[superportal] failed to load shell', err);
});
