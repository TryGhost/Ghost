const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const _ = require('lodash');
const models = require('../../../../../core/server/models');
const actionsMap = require('../../../../../core/server/services/permissions/actions-map-cache');
const permissions = require('../../../../../core/server/services/permissions');

describe('Permissions', function () {
    let fakePermissions = [];

    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(models.Permission, 'findAll').callsFake(function () {
            return Promise.resolve(models.Permissions.forge(fakePermissions));
        });

        sinon.stub(models.Post, 'findOne').callsFake(function () {
            return Promise.resolve(models.Post.forge(testUtils.DataGenerator.Content.posts[0]));
        });

        sinon.stub(models.Tag, 'findOne').callsFake(function () {
            return Promise.resolve({});
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    /**
     * Default test actionMap looks like this:
     * {
     *   browse: [ 'post' ],
     *   edit: [ 'post', 'tag', 'user', 'page' ],
     *   add: [ 'post', 'user', 'page' ],
     *   destroy: [ 'post', 'user' ]
     * }
     *
     * @param {object} options
     * @return {Array|*}
     */
    function loadFakePermissions(options) {
        options = options || {};

        const fixturePermissions = _.cloneDeep(testUtils.DataGenerator.Content.permissions);

        const extraPerm = {
            name: 'test',
            action_type: 'edit',
            object_type: 'post'
        };

        if (options.extra) {
            fixturePermissions.push(extraPerm);
        }

        return _.map(fixturePermissions, function (testPerm) {
            return testUtils.DataGenerator.forKnex.createPermission(testPerm);
        });
    }

    describe('No init (no action map)', function () {
        it('throws an error without actionMap', function () {
            sinon.stub(actionsMap, 'empty').returns(true);

            permissions.canThis.should.throw(/No actions map found/);
        });
    });

    describe('Init (build actions map)', function () {
        it('can load an actions map from existing permissions', function (done) {
            fakePermissions = loadFakePermissions();

            permissions.init().then(function (actions) {
                should.exist(actions);

                permissions.canThis.should.not.throwError();

                _.keys(actions).should.eql(['browse', 'edit', 'add', 'destroy']);

                actions.browse.should.eql(['post']);
                actions.edit.should.eql(['post', 'tag', 'user', 'page']);
                actions.add.should.eql(['post', 'user', 'page']);
                actions.destroy.should.eql(['post', 'user']);

                done();
            }).catch(done);
        });

        it('can load an actions map from existing permissions, and deduplicate', function (done) {
            fakePermissions = loadFakePermissions({extra: true});

            permissions.init().then(function (actions) {
                should.exist(actions);

                permissions.canThis.should.not.throwError();

                _.keys(actions).should.eql(['browse', 'edit', 'add', 'destroy']);

                actions.browse.should.eql(['post']);
                actions.edit.should.eql(['post', 'tag', 'user', 'page']);
                actions.add.should.eql(['post', 'user', 'page']);
                actions.destroy.should.eql(['post', 'user']);

                done();
            }).catch(done);
        });
    });
});
