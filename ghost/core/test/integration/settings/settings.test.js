const db = require('../../../core/server/data/db');
const testUtils = require('../../utils');

/**
 * @NOTE
 *
 * If this test fails for you, you have modified the default settings.
 * When you make a change or add new setting, please ensure that:
 * - If a new `core` setting is added/removed/renamed, update the allowlist below
 * - If a new non-`core` setting is added, it includes corresponding migration to populate its `group` and `flags`
 */

describe('Settings', function () {
    before(testUtils.setup());

    // Allowlist: Only this list needs updating when a core setting is added/removed/renamed
    const coreSettingKeys = [
        'last_mentions_report_email_timestamp',
        'db_hash',
        'routes_hash',
        'next_update_check',
        'notifications',
        'version_notifications',
        'admin_session_secret',
        'theme_session_secret',
        'ghost_public_key',
        'ghost_private_key',
        'members_public_key',
        'members_private_key',
        'members_email_auth_secret',
        'members_stripe_webhook_id',
        'members_stripe_webhook_secret'
    ];
    // If this test is failing, then it is likely a new setting has been added without group migration
    // In case of `core` setting modifications, allowlist above needs to be updated
    it('should not modify core keys without fixing this test', function () {
        return db.knex('settings')
            .where('group', 'core')
            .whereNotIn('key', coreSettingKeys)
            .count('*')
            .then(function (data) {
                const countResult = data[0]['count(*)'];
                countResult.should.eql(0);
            })
            .catch(function (err) {
            // CASE: table does not exist
                if (err.errno === 1146) {
                    return Promise.resolve();
                }
                throw err;
            });
    });
});
