const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const settings = rewire('../../../core/server/services/settings');

describe('UNIT: server settings', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('reinit', function () {
        function setupSettings(oldSettings, newSettings) {
            const spy = sinon.spy();
            const models = {
                Settings: {
                    populateDefaults: sinon.stub()
                }
            };
            models.Settings.populateDefaults.resolves({
                models: [{
                    attributes: {
                        key: 'db_hash'
                    },
                    emitChange: spy
                }]
            });

            const cache = {
                getAll: sinon.stub(),
                init: sinon.stub(),
                shutdown: sinon.stub()
            };

            cache.getAll.returns(oldSettings);
            cache.init.returns(newSettings);

            settings.__set__({
                models,
                SettingsCache: cache
            });

            return spy;
        }

        it('emit is not fired when the settings value is same', async function () {
            const oldSettings = {
                db_hash: {
                    id: '5f4e32961c5a161b10dbff99',
                    group: 'core',
                    key: 'db_hash',
                    value: '342c470a-d4e2-4aa1-9dd3-fb5f11d82db6',
                    type: 'string',
                    flags: null,
                    created_at: '2020-09-01T11:37:58.000Z',
                    created_by: '1',
                    updated_at: '2020-09-01T11:37:58.000Z',
                    updated_by: '1'
                }
            };
            const newSettings = oldSettings;

            const spy = setupSettings(oldSettings, newSettings);

            await settings.reinit();

            spy.calledWith('db_hash.edited', {}).should.not.be.true();
        });

        it('emit is fired when the settings value is changed', async function () {
            const oldSettings = {
                db_hash: {
                    id: '5f4e32961c5a161b10dbff99',
                    group: 'core',
                    key: 'db_hash',
                    value: '342c470a-d4e2-4aa1-9dd3-fb5f11d82db6',
                    type: 'string',
                    flags: null,
                    created_at: '2020-09-01T11:37:58.000Z',
                    created_by: '1',
                    updated_at: '2020-09-01T11:37:58.000Z',
                    updated_by: '1'
                }
            };
            const newSettings = {
                db_hash: {
                    id: '5f4e32961c5a161b10dbff99',
                    group: 'core',
                    key: 'db_hash',
                    value: '12345', // changed
                    type: 'string',
                    flags: null,
                    created_at: '2020-09-01T11:37:58.000Z',
                    created_by: '1',
                    updated_at: '2020-09-01T11:37:58.000Z',
                    updated_by: '1'
                }
            };

            const spy = setupSettings(oldSettings, newSettings);

            await settings.reinit();

            spy.calledWith('db_hash.edited', {}).should.be.true();
        });
    });
});
