// # Facebook URL Helper
// Usage: `{{facebook_url}}` or `{{facebook_url author.facebook}}`
//
// Output a url for a facebook username
// @ts-expect-error JavaScript module has no type declarations.
import { socialUrls } from '../services/proxy';
// @ts-expect-error JavaScript module has no type declarations.
import { localUtils } from '../services/handlebars';

type FacebookUrlOptions = { data: { site: unknown } };

function isFacebookUrlOptions(value: unknown): value is FacebookUrlOptions {
  return typeof value === 'object' && value !== null && 'data' in value;
}

// We use the name facebook_url to match the helper for consistency:
/**
 * @deprecated Use {{social_url type="facebook"}} instead.
 */
// eslint-disable-next-line camelcase
export function facebook_url(
  this: unknown,
  usernameOrOptions: string | FacebookUrlOptions,
  options?: FacebookUrlOptions,
): string | null {
  let username: string | undefined;

  if (!options) {
    if (!isFacebookUrlOptions(usernameOrOptions)) {
      return null;
    }

    options = usernameOrOptions;
    username = localUtils.findKey('facebook', this, options.data.site);
  } else if (typeof usernameOrOptions === 'string') {
    username = usernameOrOptions;
  }

  if (username) {
    return socialUrls.facebook(username);
  }

  return null;
}
