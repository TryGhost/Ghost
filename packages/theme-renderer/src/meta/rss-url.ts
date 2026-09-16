/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/meta/rss-url.js @ 407e032dc7 —
// transforms: `routingService.registry.getRssUrl` → seam getRssUrl stub
// (the registry walks mounted Express routers; see docs/provenance.md).
import { getRssUrl as registryGetRssUrl } from '../seam/proxy.ts';

function getRssUrl(_data: any, absolute?: boolean) {
  return registryGetRssUrl({
    absolute: absolute,
  });
}

export default getRssUrl;
