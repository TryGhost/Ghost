const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');

// Stuff we are testing
const models = require('../../../core/server/models');

const SETTINGS_LENGTH = 104;

describe('Settings Model', function () {
    before(models.init);
    afterEach(testUtils.teardownDb);

    describe('defaults', function () {
        it('populates all defaults', async function () {
            const settings = await models.Settings.findAll();
            assert.equal(settings.length, 0);

            await models.Settings.populateDefaults();

            const settingsPopulated = await models.Settings.findAll();
            assert.equal(settingsPopulated.length, SETTINGS_LENGTH);
        });

        it('doesn\'t overwrite any existing settings', async function () {
            const now = db.knex.raw('CURRENT_TIMESTAMP');
            await db.knex
                .table('settings')
                .insert({
                    id: 'test_id',
                    key: 'title',
                    value: 'Testing Defaults',
                    flags: 'PUBLIC',
                    type: 'string',
                    created_at: now,
                    updated_at: now
                });

            const settings = await models.Settings.findAll();
            assert.equal(settings.length, 1);

            await models.Settings.populateDefaults();

            const settingsPopulated = await models.Settings.findAll();
            assert.equal(settingsPopulated.length, SETTINGS_LENGTH);

            const titleSetting = settingsPopulated.models.find(s => s.get('key') === 'title');
            assert.equal(titleSetting.get('value'), 'Testing Defaults');

            const descriptionSetting = settingsPopulated.models.find(s => s.get('key') === 'description');
            assert.equal(descriptionSetting.get('value'), 'Thoughts, stories and ideas');
        });
    });
});
