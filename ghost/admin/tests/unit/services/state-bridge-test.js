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

    let service, store, config, settings, membersUtils, themeManagement, ui;

    beforeEach(function () {
        service = this.owner.lookup('service:state-bridge');
        store = this.owner.lookup('service:store');
        config = this.owner.lookup('config:main');
        settings = this.owner.lookup('service:settings');
        membersUtils = this.owner.lookup('service:members-utils');
        themeManagement = this.owner.lookup('service:theme-management');
        ui = this.owner.lookup('service:ui');

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

    describe('#setSidebarVisible', function () {
        it('triggers sidebarVisibilityChange event with correct parameters', function () {
            const handler = sinon.spy();

            service.on('sidebarVisibilityChange', handler);

            service.setSidebarVisible(false);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                isVisible: false
            });
        });

        it('triggers event when setting sidebar to visible', function () {
            const handler = sinon.spy();

            service.on('sidebarVisibilityChange', handler);

            service.setSidebarVisible(true);

            expect(handler.calledOnce).to.be.true;
            expect(handler.firstCall.args[0]).to.deep.equal({
                isVisible: true
            });
        });

        it('allows multiple handlers to be registered', function () {
            const handler1 = sinon.spy();
            const handler2 = sinon.spy();

            service.on('sidebarVisibilityChange', handler1);
            service.on('sidebarVisibilityChange', handler2);

            service.setSidebarVisible(false);

            expect(handler1.calledOnce).to.be.true;
            expect(handler2.calledOnce).to.be.true;
            expect(handler1.firstCall.args[0]).to.deep.equal(handler2.firstCall.args[0]);
        });

        it('handlers can be removed with off', function () {
            const handler = sinon.spy();

            service.on('sidebarVisibilityChange', handler);
            service.off('sidebarVisibilityChange', handler);

            service.setSidebarVisible(false);

            expect(handler.called).to.be.false;
        });
    });

    describe('#sidebarVisible', function () {
        it('returns true when ui.isFullScreen is false', function () {
            ui.set('isFullScreen', false);

            expect(service.sidebarVisible).to.be.true;
        });

        it('returns false when ui.isFullScreen is true', function () {
            ui.set('isFullScreen', true);

            expect(service.sidebarVisible).to.be.false;
        });

        it('reflects changes to ui.isFullScreen', function () {
            ui.set('isFullScreen', false);
            expect(service.sidebarVisible).to.be.true;

            ui.set('isFullScreen', true);
            expect(service.sidebarVisible).to.be.false;

            ui.set('isFullScreen', false);
            expect(service.sidebarVisible).to.be.true;
        });
    });

    describe('#getRouteUrl', function () {
        let postsController, membersController, originalLookup;

        beforeEach(function () {
            // Mock controllers
            postsController = EmberObject.create({
                queryParams: ['type'],
                type: null
            });

            membersController = EmberObject.create({
                queryParams: [{filterParam: 'filter'}],
                filterParam: null
            });

            // Stub the owner's lookup method to return our mock controllers
            originalLookup = this.owner.lookup.bind(this.owner);
            sinon.stub(this.owner, 'lookup').callsFake((name) => {
                if (name === 'controller:posts') {
                    return postsController;
                }
                if (name === 'controller:members') {
                    return membersController;
                }
                // Fall back to original lookup for services, etc.
                return originalLookup(name);
            });

            // Stub router methods
            sinon.stub(service.router, 'urlFor').callsFake((routeName, options = {}) => {
                const params = options.queryParams || {};
                const queryString = Object.keys(params).length > 0 
                    ? '?' + new URLSearchParams(params).toString() 
                    : '';
                return routeName + queryString;
            });
        });

        it('returns empty string when routeName is null', function () {
            const url = service.getRouteUrl(null);
            expect(url).to.equal('');
        });

        it('returns empty string when routeName is undefined', function () {
            const url = service.getRouteUrl(undefined);
            expect(url).to.equal('');
        });

        it('returns base route when on the same route', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');

            const url = service.getRouteUrl('posts');
            expect(url).to.equal('posts');
        });

        it('returns base route when on a subpath of the route', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'members.index');

            const url = service.getRouteUrl('members');
            expect(url).to.equal('members');
        });

        it('generates URL with provided query params', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');

            const url = service.getRouteUrl('posts', {type: 'draft'});
            expect(url).to.equal('posts?type=draft');
        });

        it('generates URL with multiple query params', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');

            const url = service.getRouteUrl('posts', {type: 'draft', author: 'john'});
            expect(url).to.include('type=draft');
            expect(url).to.include('author=john');
        });

        it('filters out null, undefined, and empty string query params', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');

            const url = service.getRouteUrl('posts', {
                type: 'draft',
                author: null,
                tag: undefined,
                search: ''
            });
            expect(url).to.equal('posts?type=draft');
        });

        it('properly encodes special characters in query params', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');

            const url = service.getRouteUrl('members', {filter: 'name:~\'O\'Brien\''});
            expect(url).to.include('filter=');
            // URLSearchParams encodes special characters (colons, tildes, quotes, etc.)
            expect(url).to.include('name%3A'); // encoded colon
            expect(url).to.include('%27'); // encoded single quote
        });

        it('generates URL from controller query params when not on route and no params provided', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');
            postsController.set('type', 'published');

            const url = service.getRouteUrl('posts');
            expect(url).to.equal('posts?type=published');
        });

        it('handles mapped query params correctly', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');
            membersController.set('filterParam', 'status:free');

            // The controller has {filterParam: 'filter'}, so the URL should use 'filter' not 'filterParam'
            const url = service.getRouteUrl('members');
            expect(url).to.equal('members?filter=status%3Afree');
        });

        it('returns base route when controller does not exist', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');

            // 'tags' controller doesn't exist in our mock owner
            const url = service.getRouteUrl('tags');
            expect(url).to.equal('tags');
        });

        it('returns base route when controller params match a custom view', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'dashboard');
            postsController.set('type', 'draft');
            
            sinon.stub(service.customViews, 'findView').returns({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            });

            const url = service.getRouteUrl('posts');
            expect(url).to.equal('posts');
        });

        it('generates consistent URLs for navigating between filtered views', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            postsController.set('type', 'draft');

            // First navigate to drafts view
            const draftsUrl = service.getRouteUrl('posts', {type: 'draft'});
            expect(draftsUrl).to.equal('posts?type=draft');

            // Then navigate to published view
            const publishedUrl = service.getRouteUrl('posts', {type: 'published'});
            expect(publishedUrl).to.equal('posts?type=published');

            // Navigate back to base posts (should reset)
            postsController.set('type', null);
            const baseUrl = service.getRouteUrl('posts');
            expect(baseUrl).to.equal('posts');
        });
    });

    describe('#isRouteActive', function () {
        it('returns true when route name matches exactly', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('posts');
            expect(isActive).to.be.true;
        });

        it('returns true when current route is a subpath of provided route', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'members.index');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('members');
            expect(isActive).to.be.true;
        });

        it('returns false when route name does not match', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'pages');

            const isActive = service.isRouteActive('posts');
            expect(isActive).to.be.false;
        });

        it('supports array of route names', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'member');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive(['members', 'member', 'member.new']);
            expect(isActive).to.be.true;
        });

        it('supports space-separated string of route names', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'tag');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('tags tag tag.new');
            expect(isActive).to.be.true;
        });

        it('returns false when not on any of the provided routes', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');

            const isActive = service.isRouteActive(['members', 'member', 'member.new']);
            expect(isActive).to.be.false;
        });

        it('main navigation link is inactive when a filtered view is active', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            }));

            const isActive = service.isRouteActive('posts');
            expect(isActive).to.be.false;
        });

        it('main navigation link is active when no filtered view is active', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('posts');
            expect(isActive).to.be.true;
        });

        it('returns true when query params match active view', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            }));
            sinon.stub(service.customViews, 'cleanFilter').returns({type: 'draft'});
            sinon.stub(service.customViews, 'isFilterEqual').returns(true);

            const isActive = service.isRouteActive('posts', {type: 'draft'});
            expect(isActive).to.be.true;
        });

        it('returns false when query params do not match active view', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            }));
            sinon.stub(service.customViews, 'cleanFilter').returns({type: 'scheduled'});
            sinon.stub(service.customViews, 'isFilterEqual').returns(false);

            const isActive = service.isRouteActive('posts', {type: 'scheduled'});
            expect(isActive).to.be.false;
        });

        it('returns false when query params provided but no active view', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('posts', {type: 'draft'});
            expect(isActive).to.be.false;
        });

        it('returns false when active view is for different route', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Authors',
                route: 'pages',
                filter: {author: 'john'}
            }));

            const isActive = service.isRouteActive('posts', {type: 'draft'});
            expect(isActive).to.be.false;
        });

        it('uses first route in array as primary route for query param matching', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'member');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Free Members',
                route: 'members',
                filter: {status: 'free'}
            }));
            sinon.stub(service.customViews, 'cleanFilter').returns({status: 'free'});
            sinon.stub(service.customViews, 'isFilterEqual').returns(true);

            const isActive = service.isRouteActive(['members', 'member', 'member.new'], {status: 'free'});
            expect(isActive).to.be.true;
        });

        it('handles _loading route suffix correctly', function () {
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts_loading');
            sinon.stub(service.customViews, 'activeView').get(() => null);

            const isActive = service.isRouteActive('posts');
            expect(isActive).to.be.true;
        });
    });

    describe('routing integration', function () {
        it('getRouteUrl and isRouteActive work consistently for filtered views', function () {
            // Setup: User is on posts page with drafts filter active
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            }));
            sinon.stub(service.customViews, 'cleanFilter').returns({type: 'draft'});
            sinon.stub(service.customViews, 'isFilterEqual').callsFake((filter1, filter2) => {
                return JSON.stringify(filter1) === JSON.stringify(filter2);
            });
            sinon.stub(service.router, 'urlFor').callsFake((routeName, options = {}) => {
                const params = options.queryParams || {};
                const queryString = Object.keys(params).length > 0 
                    ? '?' + new URLSearchParams(params).toString() 
                    : '';
                return routeName + queryString;
            });

            // When getting URL for drafts filter
            const draftsUrl = service.getRouteUrl('posts', {type: 'draft'});
            
            // And checking if that filter is active
            const isDraftsActive = service.isRouteActive('posts', {type: 'draft'});
            
            // Then the URL should be generated correctly
            expect(draftsUrl).to.equal('posts?type=draft');
            // And the active state should match
            expect(isDraftsActive).to.be.true;

            // When checking if a different filter is active
            const isPublishedActive = service.isRouteActive('posts', {type: 'published'});
            
            // Then it should not be active
            expect(isPublishedActive).to.be.false;
        });

        it('main link URL and active state are consistent when on base route', function () {
            // Setup: User is on base posts page (no filters)
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => null);
            sinon.stub(service.router, 'urlFor').callsFake(routeName => routeName);

            // When getting the main link URL (no query params)
            const postsUrl = service.getRouteUrl('posts');
            
            // And checking if main link is active
            const isMainLinkActive = service.isRouteActive('posts');
            
            // Then both should indicate the base route
            expect(postsUrl).to.equal('posts');
            expect(isMainLinkActive).to.be.true;
        });

        it('clicking a link resets filters when already on that route', function () {
            // Setup: User is on posts page with filters
            sinon.stub(service.router, 'currentRouteName').get(() => 'posts');
            sinon.stub(service.customViews, 'activeView').get(() => ({
                name: 'Drafts',
                route: 'posts',
                filter: {type: 'draft'}
            }));
            sinon.stub(service.router, 'urlFor').callsFake(routeName => routeName);

            // When clicking the main posts link (expecting to reset filters)
            const resetUrl = service.getRouteUrl('posts');
            
            // Then it should return the base route without query params
            expect(resetUrl).to.equal('posts');
        });
    });
});
