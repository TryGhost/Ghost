/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/asset.js @ 407e032dc7 — transforms: imports→seam
// # Asset helper
// Usage: `{{asset "css/screen.css"}}`
//
// Returns the path to the specified asset.
import { urlUtils } from '../seam/proxy.ts';
import * as metaData from '../meta/index.ts';
import { SafeString } from '../seam/handlebars-env.ts';

import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import get from 'lodash/get.js';

const { getAssetUrl } = metaData;

const messages = {
  pathIsRequired: 'The {{asset}} helper must be passed a path',
};

export default function asset(path: any, options: any) {
  const hasMinFile = get(options, 'hash.hasMinFile');

  if (!path) {
    throw new errors.IncorrectUsageError({
      message: tpl(messages.pathIsRequired),
    });
  }
  if (
    typeof urlUtils.getSiteUrl() !== 'undefined' &&
    typeof urlUtils.getAdminUrl() !== 'undefined' &&
    urlUtils.getSiteUrl() !== urlUtils.getAdminUrl()
  ) {
    const target = new URL(getAssetUrl(path, hasMinFile), urlUtils.getSiteUrl());
    return new SafeString(target.href);
  }

  return new SafeString(getAssetUrl(path, hasMinFile));
}
