/** The legacy client for requests to addresses a publisher supplies. It refuses to call the site itself, which it knows from one site's config. */
import { forSite } from './for-site';

const legacy: (
  url: string,
  options: Record<string, unknown>,
) => Promise<unknown> = require('../../core/server/lib/request-external');

export const externalRequest = forSite(legacy);
