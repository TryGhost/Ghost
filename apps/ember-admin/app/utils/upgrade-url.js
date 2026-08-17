const DEFAULT_UPGRADE_URL = '#/pro';
const ALLOWED_SCHEMES = ['http:', 'https:'];

// Mirrors upgradeRoute() in @tryghost/admin-x-framework/api/config, which Ember
// can't import. Returns an href, so in-app values are anchored to the admin hash
// and other schemes are rejected the way navigateTo() rejects them on the React side
export default function upgradeUrl(config, fallback = DEFAULT_UPGRADE_URL) {
    const configured = config?.hostSettings?.billing?.upgradeUrl;

    if (!configured) {
        return fallback;
    }

    if (/^[a-z]+:/i.test(configured)) {
        try {
            return ALLOWED_SCHEMES.includes(new URL(configured).protocol) ? configured : fallback;
        } catch (e) {
            return fallback;
        }
    }

    return configured.startsWith('#') ? configured : `#/${configured.replace(/^\/+/, '')}`;
}
