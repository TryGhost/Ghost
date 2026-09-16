/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/data/entry-lookup.js @ 407e032dc7 —
// transforms: CJS → ESM; lazy `require('../proxy').api` → the seam's call-time
// `api` proxy; `url.parse(postUrl).path` → manual query/hash strip (web URL
// cannot parse bare paths); giftToken lookup option dropped (gift links are
// out of the package's scope — anonymous rendering only); @tryghost/debug →
// dropped.
import _ from '../utils/lodash.ts';
import matchPermalinkParams from './match-permalink-params.ts';
import { api } from '../seam/proxy.ts';

/**
 * Query API for a single entry/resource.
 * @param {string} postUrl
 * @param {Object} routerOptions
 * @param {Object} locals
 * @returns {*}
 */
function entryLookup(postUrl: string, routerOptions: any, locals: any): Promise<any> {
  const targetPath = postUrl.split('#')[0]!.split('?')[0]!;
  let isEditURL = false;

  // CASE: e.g. /:slug/ -> { slug: 'value' }
  const params = matchPermalinkParams(routerOptions.permalinks, targetPath);

  // CASE 1: no matches, resolve
  // CASE 2: params can be empty e.g. permalink is /featured/:options(edit)?/ and path is /featured/
  if (params === false || !Object.keys(params).length) {
    return Promise.resolve(undefined);
  }

  // CASE: redirect if url contains `/edit/` at the end
  if (params.options && params.options.toLowerCase() === 'edit') {
    isEditURL = true;
  }

  const options: any = {
    include: 'authors,tags,tiers',
  };

  options.context = { member: locals.member };

  return (api[routerOptions.query.controller] || api[routerOptions.query.resource])
    .read(_.extend(_.pick(params, 'slug', 'id'), options))
    .then(function then(result: any) {
      const entry = result[routerOptions.query.resource][0];

      if (!entry) {
        return Promise.resolve(undefined);
      }

      return {
        entry: entry,
        isEditURL: isEditURL,
        isUnknownOption: isEditURL ? false : !!params.options,
      };
    });
}

export default entryLookup;
