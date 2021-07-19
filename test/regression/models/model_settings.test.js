const should = require('should');
const sinon = require('sinon');
const mockDb = require('mock-knex');

const models = require('../../../core/server/models');
const {knex} = require('../../../core/server/data/db');
const events = require('../../../core/server/lib/common/events');
const defaultSettings = require('../../../core/server/data/schema/default-settings');

describe('Settings Model', function () {
    let tracker;
    let eventSpy;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        mockDb.mock(knex);
        tracker = mockDb.getTracker();
        tracker.install();
    });

    afterEach(function () {
        mockDb.unmock(knex);
        tracker.uninstall();
    });

    beforeEach(function () {
        eventSpy = sinon.spy(events, 'emit');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('populates unset defaults', function () {
        let insertQueries = [];

        tracker.on('query', (query) => {
            // skip group and flags columns so we can test the insertion column skip
            if (query.method === 'columnInfo') {
                return query.response([
                    {name: 'id', type: 'varchar'},
                    // {name: 'group', type: 'varchar'},
                    {name: 'key', type: 'varchar'},
                    {name: 'value', type: 'varchar'},
                    {name: 'type', type: 'varchar'},
                    // {name: 'flags', type: 'varchar'},
                    {name: 'created_at', type: 'datetime'},
                    {name: 'created_by', type: 'varchar'},
                    {name: 'updated_at', type: 'varchar'},
                    {name: 'updated_by', type: 'datetime'}
                ]);
            }

            if (query.method === 'insert') {
                insertQueries.push(query);
            }

            return query.response([{}]);
        });

        return models.Settings.populateDefaults()
            .then(() => {
                const numberOfSettings = Object.keys(defaultSettings).reduce((settings, settingGroup) => {
                    return settings.concat(Object.keys(defaultSettings[settingGroup]));
                }, []).length;

                insertQueries.length.should.equal(numberOfSettings);

                // non-existent columns should not be populated
                insertQueries[0].sql.should.not.match(/group/);
                insertQueries[0].sql.should.not.match(/flags/);

                // no events are emitted because we're not using the model layer
                eventSpy.callCount.should.equal(0);
            });
    });

    it('doesn\'t overwrite any existing settings', function () {
        let insertQueries = [];

        tracker.on('query', (query) => {
            if (query.method === 'columnInfo') {
                return query.response([
                    {name: 'id', type: 'varchar'},
                    {name: 'key', type: 'varchar'},
                    {name: 'value', type: 'varchar'}
                ]);
            }

            if (query.method === 'insert') {
                insertQueries.push(query);
            }

            return query.response([{
                key: 'description',
                value: 'Adam\'s Blog'
            }]);
        });

        return models.Settings.populateDefaults()
            .then(() => {
                const numberOfSettings = Object.keys(defaultSettings).reduce((settings, settingGroup) => {
                    return settings.concat(Object.keys(defaultSettings[settingGroup]));
                }, []).length;

                insertQueries.length.should.equal(numberOfSettings - 1);
            });
    });
});
