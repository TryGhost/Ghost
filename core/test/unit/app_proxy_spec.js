/*globals describe, beforeEach, afterEach,  before, it*/
var should = require('should'),
    sinon = require('sinon'),
    _ = require("underscore"),
    helpers = require('../../server/helpers'),
    filters = require('../../server/filters'),

    // Stuff we are testing
    appProxy = require('../../server/apps/proxy');

describe('App Proxy', function () {

    var sandbox,
        fakeApi;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        fakeApi = {
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
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('creates a ghost proxy', function () {
        should.exist(appProxy.filters);
        appProxy.filters.register.should.equal(filters.registerFilter);
        appProxy.filters.unregister.should.equal(filters.unregisterFilter);

        should.exist(appProxy.helpers);
        appProxy.helpers.register.should.equal(helpers.registerThemeHelper);
        appProxy.helpers.registerAsync.should.equal(helpers.registerAsyncThemeHelper);

        should.exist(appProxy.api);

        should.exist(appProxy.api.posts);
        should.not.exist(appProxy.api.posts.edit);
        should.not.exist(appProxy.api.posts.add);
        should.not.exist(appProxy.api.posts.destroy);

        should.not.exist(appProxy.api.users);

        should.exist(appProxy.api.tags);

        should.exist(appProxy.api.notifications);
        should.not.exist(appProxy.api.notifications.destroy);

        should.exist(appProxy.api.settings);
        should.not.exist(appProxy.api.settings.browse);
        should.not.exist(appProxy.api.settings.add);

    });
});