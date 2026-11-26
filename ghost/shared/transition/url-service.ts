/** The legacy URL service: works out the public address of a post, page, tag or author. */
import { forSite } from './for-site';

const legacy: {
  getUrlForResource(
    resource: Record<string, unknown>,
    options: { absolute: boolean },
  ): string | null;
} = require('../../core/server/services/url');

export const urlService = forSite(legacy);
