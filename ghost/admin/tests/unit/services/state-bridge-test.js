import EmberObject from '@ember/object';
import sinon from 'sinon';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

const buildMockModel = () => {
    return EmberObject.create({
        eachRelationship: sinon.stub().returns([])
    });
};

const buildMockModelCollection = (models) => {
    return Object.assign(models, {
        filterBy(key, value) {
            return models.filter(model => model.get(key) === value);
        }
    });
};

describe('Unit: Service: state-bridge', function () {
    setupTest();

    let service, store, config, settings, membersUtils, themeManagement;

    beforeEach(function () {
        service = this.owner.lookup('service:state-bridge');
        store = this.owner.lookup('service:store');
        config = this.owner.lookup('config:main');
        settings = this.owner.lookup('service:settings');
        membersUtils = this.owner.lookup('service:members-utils');
        themeManagement = this.owner.lookup('service:theme-management');

        // Set up basic spies
        sinon.spy(store, 'pushPayload');
        sinon.spy(store, 'push');
        sinon.spy(store, 'unloadAll');
        sinon.spy(settings, 'reload');
        sinon.spy(membersUtils, 'reload');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('#onUpdate', function () {
        it('throws error for unknown data type', function () {
            expect(() => {
                service.onUpdate('UnknownType', {});
            }).to.throw('A mutation updating UnknownType succeeded in React Admin but there is no mapping to an Ember type');
        });

        it('skips processing for null-mapped data types', function () {
            const response = {customThemeSettings: [{key: 'test', value: 'value'}]};

            run(() => {
                service.onUpdate('CustomThemeSettingsResponseType', response);
            });

            expect(store.pushPayload.called).to.be.false;
        });

        it('pushes data to store for regular data types', function () {
            const response = {integrations: [{id: '1', name: 'Test Integration'}]};

            run(() => {
                service.onUpdate('IntegrationsResponseType', response);
            });

            expect(store.pushPayload.calledOnce).to.be.true;
            expect(store.pushPayload.calledWith('integration', response)).to.be.true;
        });

        it('pushes data to store for settings (singleton)', function () {
            const response = {
                settings: [
                    {key: 'title', value: 'My Ghost Site'},
                    {key: 'description', value: 'A test site'}
                ]
            };

            // Mock the serializer and model
            const mockNormalizedResponse = {data: {id: '1', type: 'setting'}};
            const mockSerializer = {
                normalizeSingleResponse: sinon.stub().returns(mockNormalizedResponse)
            };
            const mockModel = buildMockModel();

            sinon.stub(store, 'serializerFor').returns(mockSerializer);
            sinon.stub(store, 'modelFor').returns(mockModel);

            run(() => {
                service.onUpdate('SettingsResponseType', response);
            });

            expect(store.push.calledOnce).to.be.true;
            expect(store.pushPayload.called).to.be.false;
        });

        describe('SettingsResponseType side effects', function () {
            it('updates config.blogTitle when settings are updated', function () {
                const response = {
                    settings: [
                        {key: 'title', value: 'Updated Blog Title'},
                        {key: 'description', value: 'A test site'}
                    ]
                };

                // Mock the serializer and model
                const mockNormalizedResponse = {data: {id: '1', type: 'setting'}};
                const mockSerializer = {
                    normalizeSingleResponse: sinon.stub().returns(mockNormalizedResponse)
                };
                const mockModel = buildMockModel();

                sinon.stub(store, 'serializerFor').returns(mockSerializer);
                sinon.stub(store, 'modelFor').returns(mockModel);

                run(() => {
                    service.onUpdate('SettingsResponseType', response);
                });

                expect(config.blogTitle).to.equal('Updated Blog Title');
            });

            it('reloads settings service when settings are updated', function () {
                const response = {
                    settings: [
                        {key: 'title', value: 'Test'},
                        {key: 'description', value: 'Test'}
                    ]
                };

                // Mock the serializer and model
                const mockNormalizedResponse = {data: {id: '1', type: 'setting'}};
                const mockSerializer = {
                    normalizeSingleResponse: sinon.stub().returns(mockNormalizedResponse)
                };
                const mockModel = buildMockModel();

                sinon.stub(store, 'serializerFor').returns(mockSerializer);
                sinon.stub(store, 'modelFor').returns(mockModel);

                run(() => {
                    service.onUpdate('SettingsResponseType', response);
                });

                expect(settings.reload.calledOnce).to.be.true;
            });
        });

        describe('TiersResponseType side effects', function () {
            it('reloads membersUtils when tiers are updated', function () {
                const response = {tiers: [{id: '1', name: 'Premium'}]};

                run(() => {
                    service.onUpdate('TiersResponseType', response);
                });

                expect(membersUtils.reload.calledOnce).to.be.true;
            });
        });

        describe('ThemesResponseType side effects', function () {
            it('updates active theme when theme is activated', function () {
                // Set up existing themes in store
                const previousTheme = EmberObject.create({
                    id: '1',
                    name: 'casper',
                    active: true
                });
                const newTheme = EmberObject.create({
                    id: '2',
                    name: 'dawn',
                    active: false
                });

                sinon.stub(store, 'peekAll').returns(buildMockModelCollection([previousTheme, newTheme]));

                const response = {
                    themes: [
                        {id: '1', name: 'casper', active: false},
                        {id: '2', name: 'dawn', active: true}
                    ]
                };

                run(() => {
                    service.onUpdate('ThemesResponseType', response);
                });

                expect(previousTheme.get('active')).to.be.false;
                expect(newTheme.get('active')).to.be.true;
                expect(themeManagement.activeTheme).to.equal(newTheme);
            });

            it('handles theme activation when no previously active theme', function () {
                const newTheme = EmberObject.create({
                    id: '1',
                    name: 'dawn',
                    active: false
                });

                sinon.stub(store, 'peekAll').returns(buildMockModelCollection([newTheme]));

                const response = {
                    themes: [
                        {id: '1', name: 'dawn', active: true}
                    ]
                };

                run(() => {
                    service.onUpdate('ThemesResponseType', response);
                });

                expect(newTheme.get('active')).to.be.true;
                expect(themeManagement.activeTheme).to.equal(newTheme);
            });

            it('handles theme update when no theme is activated', function () {
                const response = {
                    themes: [
                        {id: '1', name: 'casper', active: false}
                    ]
                };

                sinon.stub(store, 'peekAll').returns(buildMockModelCollection([]));

                run(() => {
                    service.onUpdate('ThemesResponseType', response);
                });

                // Should not throw error
                expect(store.pushPayload.calledOnce).to.be.true;
            });
        });
    });

    describe('#onInvalidate', function () {
        it('throws error for unknown data type', function () {
            expect(() => {
                service.onInvalidate('UnknownType');
            }).to.throw('A mutation invalidating UnknownType succeeded in React Admin but there is no mapping to an Ember type');
        });

        it('skips processing for null-mapped data types', function () {
            run(() => {
                service.onInvalidate('CustomThemeSettingsResponseType');
            });

            expect(store.unloadAll.called).to.be.false;
        });

        it('warns when trying to invalidate singleton types', function () {
            const consoleWarnStub = sinon.stub(console, 'warn');

            run(() => {
                service.onInvalidate('SettingsResponseType');
            });

            expect(consoleWarnStub.calledOnce).to.be.true;
            expect(consoleWarnStub.firstCall.args[0]).to.include('marked as a singleton and cannot be reloaded');
            expect(store.unloadAll.called).to.be.false;
        });

        it('unloads all records for regular data types', function () {
            run(() => {
                service.onInvalidate('IntegrationsResponseType');
            });

            expect(store.unloadAll.calledOnce).to.be.true;
            expect(store.unloadAll.calledWith('integration')).to.be.true;
        });

        it('reloads membersUtils when tiers are invalidated', function () {
            run(() => {
                service.onInvalidate('TiersResponseType');
            });

            expect(store.unloadAll.calledWith('tier')).to.be.true;
            expect(membersUtils.reload.calledOnce).to.be.true;
        });
    });

    describe('#onDelete', function () {
        it('throws error for unknown data type', function () {
            expect(() => {
                service.onDelete('UnknownType', '123');
            }).to.throw('A mutation deleting UnknownType succeeded in React Admin but there is no mapping to an Ember type');
        });

        it('skips processing for null-mapped data types', function () {
            sinon.spy(store, 'peekRecord');

            run(() => {
                service.onDelete('CustomThemeSettingsResponseType', '123');
            });

            expect(store.peekRecord.called).to.be.false;
        });

        it('unloads record when it exists in store', function () {
            const mockRecord = EmberObject.create({id: '123'});
            mockRecord.unloadRecord = sinon.spy();

            sinon.stub(store, 'peekRecord').returns(mockRecord);

            run(() => {
                service.onDelete('IntegrationsResponseType', '123');
            });

            expect(store.peekRecord.calledWith('integration', '123')).to.be.true;
            expect(mockRecord.unloadRecord.calledOnce).to.be.true;
        });

        it('handles deletion when record does not exist in store', function () {
            sinon.stub(store, 'peekRecord').returns(null);

            run(() => {
                service.onDelete('IntegrationsResponseType', '123');
            });

            expect(store.peekRecord.calledWith('integration', '123')).to.be.true;
            // Should not throw error
        });
    });

    describe('#triggerEmberDataChange', function () {
        it('triggers emberDataChange event with correct parameters', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            const mockResponse = {
                posts: [{id: '123', title: 'Test Post'}]
            };

            stateBridge.triggerEmberDataChange('create', 'post', '123', mockResponse);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'create',
                modelName: 'post',
                id: '123',
                data: mockResponse
            });
        });

        it('triggers event for update operation', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            const mockResponse = {
                users: [{id: '456', name: 'John Doe'}]
            };

            stateBridge.triggerEmberDataChange('update', 'user', '456', mockResponse);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'update',
                modelName: 'user',
                id: '456',
                data: mockResponse
            });
        });

        it('triggers event for delete operation with null data', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('delete', 'tag', '789', null);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                operation: 'delete',
                modelName: 'tag',
                id: '789',
                data: null
            });
        });

        it('allows multiple handlers to be registered', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();

            stateBridge.on('emberDataChange', handler1);
            stateBridge.on('emberDataChange', handler2);

            const mockResponse = {
                newsletters: [{id: '111', name: 'Weekly Update'}]
            };

            stateBridge.triggerEmberDataChange('create', 'newsletter', '111', mockResponse);

            expect(handler1.calledOnce).to.be.true;
            expect(handler2.calledOnce).to.be.true;
            expect(handler1.firstCall.args[0]).to.deep.equal(handler2.firstCall.args[0]);
        });

        it('handlers can be removed with off', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);
            stateBridge.off('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('update', 'setting', '999', {});

            expect(handler.called).to.be.false;
        });

        it('handles multiple triggers correctly', function () {
            const stateBridge = this.owner.lookup('service:state-bridge');
            const handler = sinon.spy();

            stateBridge.on('emberDataChange', handler);

            stateBridge.triggerEmberDataChange('create', 'post', '1', {});
            stateBridge.triggerEmberDataChange('update', 'post', '1', {});
            stateBridge.triggerEmberDataChange('delete', 'post', '1', null);

            expect(handler.calledThrice).to.be.true;
            expect(handler.firstCall.args[0].operation).to.equal('create');
            expect(handler.secondCall.args[0].operation).to.equal('update');
            expect(handler.thirdCall.args[0].operation).to.equal('delete');
        });
    });
});
