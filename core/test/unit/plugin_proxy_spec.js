/*globals describe, beforeEach, afterEach,  before, it*/
var should = require('should'),
    sinon = require('sinon'),
    _ = require("underscore"),

    // Stuff we are testing
    createProxy = require('../../server/plugins/proxy');
    
describe('App Proxy', function () {

    var sandbox,
        fakeGhost;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        fakeGhost = {
            registerFilter: sandbox.stub(),
            unregisterFilter: sandbox.stub(),

            registerThemeHelper: sandbox.stub(),
            registerAsyncThemeHelper: sandbox.stub(),

            api: {
                posts: {
                    browse: sandbox.stub(),
                    read: sandbox.stub(),
                    edit: sandbox.stub(),
                    add: sandbox.stub(),
                    destroy: sandbox.stub()
                },
                users: {
                    browse: sandbox.stub(),
                    read: sandbox.stub(),
                    edit: sandbox.stub()
                },
                tags: {
                    all: sandbox.stub()
                },
                notifications: {
                    destroy: sandbox.stub(),
                    add: sandbox.stub()
                },
                settings: {
                    browse: sandbox.stub(),
                    read: sandbox.stub(),
                    add: sandbox.stub()
                }
            }
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('creates a ghost proxy', function () {
        var proxy = createProxy(fakeGhost);

        should.exist(proxy.filters);
        proxy.filters.register.should.equal(fakeGhost.registerFilter);
        proxy.filters.unregister.should.equal(fakeGhost.unregisterFilter);

        should.exist(proxy.helpers);
        proxy.helpers.register.should.equal(fakeGhost.registerThemeHelper);
        proxy.helpers.registerAsync.should.equal(fakeGhost.registerAsyncThemeHelper);

        should.exist(proxy.api);

        should.exist(proxy.api.posts);
        proxy.api.posts.browse.should.equal(fakeGhost.api.posts.browse);
        proxy.api.posts.read.should.equal(fakeGhost.api.posts.read);
        should.not.exist(proxy.api.posts.edit);
        should.not.exist(proxy.api.posts.add);
        should.not.exist(proxy.api.posts.destroy);

        should.not.exist(proxy.api.users);

        should.exist(proxy.api.tags);
        proxy.api.tags.all.should.equal(fakeGhost.api.tags.all);

        should.exist(proxy.api.notifications);
        should.not.exist(proxy.api.notifications.destroy);
        proxy.api.notifications.add.should.equal(fakeGhost.api.notifications.add);

        should.exist(proxy.api.settings);
        should.not.exist(proxy.api.settings.browse);
        proxy.api.settings.read.should.equal(fakeGhost.api.settings.read);
        should.not.exist(proxy.api.settings.add);

    });
});