const should = require('should');
const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');

// Stuff we are testing
const models = require('../../../core/server/models');

const SETTINGS_LENGTH = 77;

describe('Settings Model', function () {
    before(models.init);
    afterEach(testUtils.teardownDb);

    describe('defaults', function () {
        it('populates all defaults', async function () {
            const settings = await models.Settings.findAll();
            settings.length.should.equal(0);

            await models.Settings.populateDefaults();

            const settingsPopulated = await models.Settings.findAll();
            settingsPopulated.length.should.equal(SETTINGS_LENGTH);
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
                    created_by: 1,
                    updated_at: now,
                    updated_by: 1
                });

            const settings = await models.Settings.findAll();
            settings.length.should.equal(1);

            await models.Settings.populateDefaults();

            const settingsPopulated = await models.Settings.findAll();
            settingsPopulated.length.should.equal(SETTINGS_LENGTH);

            const titleSetting = settingsPopulated.models.find(s => s.get('key') === 'title');
            titleSetting.get('value').should.equal('Testing Defaults');

            const descriptionSetting = settingsPopulated.models.find(s => s.get('key') === 'description');
            descriptionSetting.get('value').should.equal('Thoughts, stories and ideas');
        });
    });
});
