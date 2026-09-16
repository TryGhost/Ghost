/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
// Copied from ghost/core/core/frontend/helpers/authors.js @ 407e032dc7 — transforms: imports→seam
// # Authors Helper
// Usage: `{{authors}}`, `{{authors separator=' - '}}`
//
// Returns a string of the authors on the post.
// By default, authors are separated by commas.
//
// Note that the standard {{#each authors}} implementation is unaffected by this helper.
import { urlService } from '../seam/proxy.ts';
import { SafeString, escapeExpression, templates } from '../seam/handlebars-env.ts';
import isString from 'lodash/isString.js';
import * as helpers from '@tryghost/helpers';

const { utils } = helpers;

export default function authors(this: any, options: any = {}) {
  options.hash = options.hash || {};

  let {
    autolink,
    separator = ', ',
    prefix = '',
    suffix = '',
    limit,
    visibility,
    from = 1,
    to,
  } = options.hash;
  let output: any = '';

  autolink = !(isString(autolink) && autolink === 'false');
  limit = limit ? parseInt(limit, 10) : limit;
  from = from ? parseInt(from, 10) : from;
  to = to ? parseInt(to, 10) : to;

  function createAuthorsList(authorsList: any) {
    function processAuthor(author: any) {
      return autolink
        ? templates.link({
            url: urlService.getUrlForResource(
              { ...author, type: 'authors' },
              { withSubdirectory: true },
            ),
            text: escapeExpression(author.name),
          })
        : escapeExpression(author.name);
    }

    return utils.visibility.filter(authorsList, visibility, processAuthor);
  }

  if (this.authors && this.authors.length) {
    output = createAuthorsList(this.authors);
    from -= 1; // From uses 1-indexed, but array uses 0-indexed.
    to = to || limit + from || output.length;
    output = output.slice(from, to).join(separator);
  }

  if (output) {
    output = prefix + output + suffix;
  }

  return new SafeString(output);
}
