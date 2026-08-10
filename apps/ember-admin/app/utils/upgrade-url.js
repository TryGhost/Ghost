const DEFAULT_UPGRADE_URL = '#/pro';

// Mirrors upgradeRoute() in @tryghost/admin-x-framework/api/config, which Ember
// can't import. Used as an href here, so a hash value needs no rewriting
export default function upgradeUrl(config) {
    return config?.hostSettings?.billing?.upgradeUrl || DEFAULT_UPGRADE_URL;
}
