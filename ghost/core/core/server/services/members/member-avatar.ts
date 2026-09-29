const config: typeof import('../../../shared/config') = require('../../../shared/config');

/**
 * The avatar shown for a member: their Gravatar, served blank when they have none, unless
 * the site has turned Gravatar off. Nothing is stored, so every place that shows a member
 * works it out from their email the same way.
 */
export function memberAvatarImage(email: string | null | undefined): string | null {
  if (!email || config.isPrivacyDisabled('useGravatar')) {
    return null;
  }
  // Required on first use, as the member model did. The image library is untyped JS, so
  // `gravatar` is not checked here.
  const { gravatar } = require('../../lib/image');
  return gravatar.url(email, { size: 250, default: 'blank' });
}
