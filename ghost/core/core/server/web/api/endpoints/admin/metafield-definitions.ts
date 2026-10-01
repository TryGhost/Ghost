import type { RequestHandler, Router } from 'express';
import { http } from '@tryghost/api-framework';
import { metafieldDefinitionsApi } from '../../../../api/endpoints/utils/metafield-definitions';

const express = require('../../../../../shared/express');
const mw = require('./middleware');

/**
 * Mounts the metafield definitions of the entity whose records live in `table`, at
 * `/<table>/metafields`.
 *
 * `writeGuards` is what changing a definition needs beyond being staff, such as a labs flag
 * or a plan limit. Reading is never guarded: Admin asks every site for its definitions to
 * draw screens it renders either way, and a site that has none simply answers with an
 * empty list rather than a 404.
 *
 * Mounted rather than listed so every route under it is reached the same way, and so the
 * guards are stated once each instead of on every route that needs them. Order carries the
 * rule, the way Express reads it: a request walks this stack from the top, so the reads
 * are answered before the guards are reached, and everything registered after them passes
 * through all of them. A route added at the end is guarded by being there, which is the
 * safer way round to forget.
 *
 * Call it before any `/<table>/:id` route, so the literal path is not captured as an id.
 */
export function mountMetafieldDefinitions(
  router: Router,
  table: string,
  writeGuards: RequestHandler[] = [],
): void {
  const path = `/${table}/metafields`;
  const api = metafieldDefinitionsApi(table);
  const definitions: Router = express.Router(`admin api ${path}`);

  // Authenticated as a route here rather than inside the mount: mounting strips the path
  // from req.url, and the check on integration keys names the resource from its first
  // segment, so inside it would see the namespace instead of the entity and refuse them.
  router.all([path, `${path}/*`], mw.authAdminApi);
  router.use(path, definitions);

  definitions.get('/:namespace', http(api.browse));
  definitions.get('/:namespace/:key', http(api.read));

  if (writeGuards.length > 0) {
    definitions.use(...writeGuards);
  }

  definitions.post('/:namespace', http(api.add));
  definitions.put('/:namespace', http(api.reorder));
  definitions.put('/:namespace/:key', http(api.edit));
  definitions.delete('/:namespace/:key', http(api.destroy));
}
