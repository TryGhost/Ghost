import type { RequestHandler, Router } from 'express';
import { http } from '@tryghost/api-framework';

const express = require('../../../../../shared/express');
const mw = require('./middleware');

type DefinitionsApi = Record<
  'browse' | 'read' | 'add' | 'reorder' | 'edit' | 'destroy',
  Parameters<typeof http>[0]
>;

/**
 * Mounts an entity's metafield definitions at `path`.
 *
 * Mounted rather than listed so every route under it is reached the same way, and so the
 * guards are stated once each instead of on every route that needs them.
 *
 * Order carries the rule here, the way Express reads it: a request walks this stack from
 * the top, so the reads below are answered before the guards are reached, and everything
 * registered after them passes through all of them. A route added at the end is guarded by
 * being there, which is the safer way round to forget.
 *
 * Call it before any `/<entity>/:id` route, so the literal path is not captured as an id.
 */
export function mountMetafieldDefinitions(
  router: Router,
  path: string,
  api: DefinitionsApi,
  writeGuards: RequestHandler[],
): void {
  const definitions: Router = express.Router(`admin api ${path}`);

  // Authenticated as a route here rather than inside the mount: mounting strips the path
  // from req.url, and the check on integration keys names the resource from its first
  // segment, so inside it would see the namespace instead of the entity and refuse them.
  router.all([path, `${path}/*`], mw.authAdminApi);
  router.use(path, definitions);

  // Reading is deliberately open: Admin asks every site for its definitions to draw
  // screens it renders either way, and a site that has none simply answers with an empty
  // list rather than a 404.
  definitions.get('/:namespace', http(api.browse));
  definitions.get('/:namespace/:key', http(api.read));

  definitions.use(...writeGuards);

  definitions.post('/:namespace', http(api.add));
  definitions.put('/:namespace', http(api.reorder));
  definitions.put('/:namespace/:key', http(api.edit));
  definitions.delete('/:namespace/:key', http(api.destroy));
}
