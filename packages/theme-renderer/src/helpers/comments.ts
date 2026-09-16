/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/comments.js @ 6be2dc0712 —
// transforms: imports→seam; one seam guard added: returns undefined when the
// instance config carries no comments script URL (core's config always has
// one; the seam only learns it when the instance scrape saw a comments tag —
// docs/deltas.md row 13). Rendering nothing beats emitting src="undefined".
import { SafeString } from '../seam/handlebars-env.ts';
import { urlUtils, getFrontendKey, settingsCache } from '../seam/proxy.ts';
import { getFrontendAppConfig, getDataAttributes } from '../utils/frontend-apps.ts';

async function comments(this: any, options: any) {
  // todo: For now check on the comment id to exclude normal pages (we probably have a better way to do this)

  const commentId = this.comment_id;

  if (!commentId) {
    return;
  }

  /**
   * We need to check if comments enabled, because the theme might not be using the other available helpers to check
   * if comments is enabled + the member has access
   * @type {'all'|'paid'|'off'}
   */
  const commentsEnabled = settingsCache.get('comments_enabled');
  const hasAccess = !!this.access;

  if (commentsEnabled === 'off' || !hasAccess) {
    return;
  }

  let colorScheme = 'auto';
  if (options.hash.mode === 'dark' || options.hash.mode === 'light') {
    colorScheme = options.hash.mode;
  }

  let avatarSaturation = parseInt(options.hash.saturation);
  if (isNaN(avatarSaturation)) {
    avatarSaturation = 60;
  }

  let count = true;
  if (options.hash.count === false) {
    count = false;
  }

  // This is null so that the comments-ui can handle the default title
  let title = null;
  if (typeof options.hash.title === 'string') {
    title = options.hash.title;
  }

  let accentColor = '';
  if (options.data.site.accent_color) {
    accentColor = options.data.site.accent_color;
  }

  const frontendKey = await getFrontendKey();
  const { scriptUrl } = getFrontendAppConfig('comments');

  if (!scriptUrl) {
    // seam guard — see the header comment
    return;
  }

  const data = {
    locale: settingsCache.get('locale') || 'en',
    'ghost-comments': urlUtils.getSiteUrl(),
    api: urlUtils.urlFor('api', { type: 'content' }, true),
    admin: urlUtils.urlFor('admin', true),
    key: frontendKey,
    title: title,
    count: count,
    'post-id': this.id,
    'color-scheme': colorScheme,
    'avatar-saturation': avatarSaturation,
    'accent-color': accentColor,
    'comments-enabled': commentsEnabled,
    publication: settingsCache.get('title'),
  };

  const dataAttributes = getDataAttributes(data);

  return new SafeString(`
        <script defer src="${scriptUrl}" ${dataAttributes} crossorigin="anonymous"></script>
    `);
}

comments.async = true;

export default comments;
