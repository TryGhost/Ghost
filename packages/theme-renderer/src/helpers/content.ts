/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias, prefer-rest-params */
// Copied from ghost/core/core/frontend/helpers/content.js @ 407e032dc7 — transforms: imports→seam
// # Content Helper
// Usage: `{{content}}`, `{{content words="20"}}`, `{{content characters="256"}}`
//
// Turns content html into a safestring so that the user doesn't have to
// escape it or tell handlebars to leave it alone with a triple-brace.
//
// Shows default or custom CTA when trying to see content without access
//
// Enables tag-safe truncation of content by characters or words.
//
// Dev flag feature: In case of restricted content access for member-only posts, shows CTA box

import { SafeString, hbs, templates } from '../seam/handlebars-env.ts';
import downsize from 'downsize-cjs';
import _ from '../utils/lodash.ts';
const createFrame = hbs.handlebars.createFrame;

function restrictedCta(this: any, options: any) {
  options = options || {};
  options.data = options.data || {};

  _.merge(this, {
    // @deprecated in Ghost 5.16.1 - not documented & removed from core templates
    accentColor: options.data.site && options.data.site.accent_color,
  });

  const data = createFrame(options.data);
  return templates.execute('content-cta', this, { data });
}

export default function content(this: any, options: any = {}) {
  const self = this;
  const args = arguments;

  const hash = options.hash || {};
  const truncateOptions: any = {};
  let runTruncate = false;

  for (const key of ['words', 'characters']) {
    if (Object.prototype.hasOwnProperty.call(hash, key)) {
      runTruncate = true;
      truncateOptions[key] = parseInt(hash[key], 10);
    }
  }

  if (this.html === null) {
    this.html = '';
  }

  if (!_.isUndefined(this.access) && !this.access) {
    return restrictedCta.apply(self, args as any);
  }

  if (runTruncate) {
    return new SafeString(downsize(this.html, truncateOptions));
  }

  return new SafeString(this.html);
}
