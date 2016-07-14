var should  = require('should'),
    sinon   = require('sinon'),
    _       = require('lodash'),
    moment  = require('moment'),
    rewire  = require('rewire'),
    Promise = require('bluebird'),

    // Stuff we are testing
    configUtils   = require('../utils/configUtils'),
    models        = require('../../server/models'),
    notifications = require('../../server/api/notifications'),
    versioning    = require('../../server/data/schema/versioning'),
    update        = rewire('../../server/data/migration/fixtures/update'),
    populate      = rewire('../../server/data/migration/fixtures/populate'),
    fixtureUtils  = require('../../server/data/migration/fixtures/utils'),
    fixtures004   = require('../../server/data/migration/fixtures/004'),
    fixtures005   = require('../../server/data/migration/fixtures/005'),
    fixtures006   = require('../../server/data/migration/fixtures/006'),

    sandbox       = sinon.sandbox.create();

describe('Fixtures', function () {
    var loggerStub, transactionStub;

    beforeEach(function () {
        loggerStub = {
            info: sandbox.stub(),
            warn: sandbox.stub()
        };

        transactionStub = sandbox.stub();

        models.init();
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('Update fixtures', function () {
        it('should call tasks in correct order if provided', function (done) {
            var sequenceStub = sandbox.stub(),
                sequenceReset = update.__set__('sequence', sequenceStub),
                tasks = [
                    sandbox.stub(),
                    sandbox.stub()
                ];

            sequenceStub.returns(Promise.resolve([]));

            update(tasks, loggerStub, {transacting: transactionStub}).then(function () {
                loggerStub.info.calledOnce.should.be.true();
                loggerStub.warn.called.should.be.false();

                sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(2);
                sequenceStub.firstCall.args[1].should.eql({transacting: transactionStub});
                sequenceStub.firstCall.args[2].should.eql(loggerStub);
                sequenceReset();
                done();
            }).catch(done);
        });

        describe('Update to 004', function () {
            it('should call all the 004 fixture upgrade tasks', function (done) {
                // Setup
                // Create a new stub, this will replace sequence, so that db calls don't actually get run
                var sequenceStub = sandbox.stub(),
                    sequenceReset = update.__set__('sequence', sequenceStub),
                    tasks = versioning.getUpdateFixturesTasks('004', loggerStub);

                sequenceStub.returns(Promise.resolve([]));

                update(tasks, loggerStub, {transacting:transactionStub}).then(function (result) {
                    should.exist(result);

                    loggerStub.info.calledOnce.should.be.true();
                    loggerStub.warn.called.should.be.false();

                    sequenceStub.calledOnce.should.be.true();
                    sequenceStub.firstCall.calledWith(sinon.match.array, sinon.match.object, loggerStub).should.be.true();
                    sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(8);
                    sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'moveJQuery');
                    sequenceStub.firstCall.args[0][1].should.be.a.Function().with.property('name', 'updatePrivateSetting');
                    sequenceStub.firstCall.args[0][2].should.be.a.Function().with.property('name', 'updatePasswordSetting');
                    sequenceStub.firstCall.args[0][3].should.be.a.Function().with.property('name', 'updateGhostAdminClient');
                    sequenceStub.firstCall.args[0][4].should.be.a.Function().with.property('name', 'addGhostFrontendClient');
                    sequenceStub.firstCall.args[0][5].should.be.a.Function().with.property('name', 'cleanBrokenTags');
                    sequenceStub.firstCall.args[0][6].should.be.a.Function().with.property('name', 'addPostTagOrder');
                    sequenceStub.firstCall.args[0][7].should.be.a.Function().with.property('name', 'addNewPostFixture');

                    // Reset
                    sequenceReset();
                    done();
                }).catch(done);
            });

            describe('Tasks:', function () {
                var getObjStub, settingsOneStub, settingsEditStub, clientOneStub, clientEditStub;

                beforeEach(function () {
                    getObjStub = {get: sandbox.stub()};
                    settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(Promise.resolve(getObjStub));
                    settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());
                    clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(getObjStub));
                    clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve());
                });

                it('should have tasks for 004', function () {
                    should.exist(fixtures004);
                    fixtures004.should.be.an.Array().with.lengthOf(8);
                });

                describe('01-move-jquery-with-alert', function () {
                    var moveJquery = fixtures004[0];

                    it('tries to move jQuery to ghost_foot', function (done) {
                        getObjStub.get.returns('');

                        moveJquery({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();

                            done();
                        }).catch(done);
                    });

                    it('does not move jQuery to ghost_foot if it is already there', function (done) {
                        getObjStub.get.returns(
                            '<!-- You can safely delete this line if your theme does not require jQuery -->\n'
                            + '<script type="text/javascript" src="https://code.jquery.com/jquery-1.11.3.min.js"></script>\n\n'
                        );

                        moveJquery({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        }).catch(done);
                    });

                    it('does not move jQuery to ghost_foot if the setting is missing', function (done) {
                        settingsOneStub.returns(Promise.resolve());

                        moveJquery({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        }).catch(done);
                    });

                    it('tried to move jQuery AND add a privacy message if any privacy settings are on', function (done) {
                        var notificationsAddStub = sandbox.stub(notifications, 'add').returns(Promise.resolve());
                        configUtils.set({privacy: {useGoogleFonts: false}});
                        getObjStub.get.returns('');

                        moveJquery({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            notificationsAddStub.calledOnce.should.be.true();
                            loggerStub.info.calledTwice.should.be.true();
                            loggerStub.warn.called.should.be.false();

                            done();
                        }).catch(done);
                    });
                });

                describe('02-update-private-setting-type', function () {
                    var updateSettingType = fixtures004[1];

                    it('tries to update setting type correctly', function (done) {
                        updateSettingType({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('isPrivate').should.be.true();
                            getObjStub.get.calledOnce.should.be.true();
                            getObjStub.get.calledWith('type').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            settingsEditStub.calledWith({key: 'isPrivate', type: 'private'}).should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(settingsOneStub, getObjStub.get, loggerStub.info, settingsEditStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to update setting type if it is already set', function (done) {
                        getObjStub.get.returns('private');

                        updateSettingType({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('isPrivate').should.be.true();
                            getObjStub.get.calledOnce.should.be.true();
                            getObjStub.get.calledWith('type').should.be.true();

                            settingsEditStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            sinon.assert.callOrder(settingsOneStub, getObjStub.get, loggerStub.warn);

                            done();
                        }).catch(done);
                    });
                });

                describe('03-update-password-setting-type', function () {
                    var updateSettingType = fixtures004[2];

                    it('tries to update setting type correctly', function (done) {
                        updateSettingType({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('password').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            settingsEditStub.calledWith({key: 'password', type: 'private'}).should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(settingsOneStub, loggerStub.info, settingsEditStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to update setting type if it is already set', function (done) {
                        getObjStub.get.returns('private');

                        updateSettingType({}, loggerStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('password').should.be.true();
                            getObjStub.get.calledOnce.should.be.true();
                            getObjStub.get.calledWith('type').should.be.true();

                            settingsEditStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            sinon.assert.callOrder(settingsOneStub, getObjStub.get);

                            done();
                        }).catch(done);
                    });
                });

                describe('04-update-ghost-admin-client', function () {
                    var updateClient = fixtures004[3];

                    it('tries to update client correctly', function (done) {
                        updateClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            getObjStub.get.calledTwice.should.be.true();
                            getObjStub.get.calledWith('secret').should.be.true();
                            getObjStub.get.calledWith('status').should.be.true();
                            clientEditStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(
                                clientOneStub, getObjStub.get, getObjStub.get, loggerStub.info, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('does not try to update client if the secret and status are already correct', function (done) {
                        getObjStub.get.withArgs('secret').returns('abc');
                        getObjStub.get.withArgs('status').returns('enabled');

                        updateClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            getObjStub.get.calledTwice.should.be.true();
                            getObjStub.get.calledWith('secret').should.be.true();
                            getObjStub.get.calledWith('status').should.be.true();
                            clientEditStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();
                            sinon.assert.callOrder(clientOneStub, getObjStub.get, getObjStub.get, loggerStub.warn);

                            done();
                        }).catch(done);
                    });

                    it('tries to update client if secret is correct but status is wrong', function (done) {
                        getObjStub.get.withArgs('secret').returns('abc');
                        getObjStub.get.withArgs('status').returns('development');

                        updateClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            getObjStub.get.calledTwice.should.be.true();
                            getObjStub.get.calledWith('secret').should.be.true();
                            getObjStub.get.calledWith('status').should.be.true();

                            clientEditStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(
                                clientOneStub, getObjStub.get, getObjStub.get, loggerStub.info, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('tries to update client if status is correct but secret is wrong', function (done) {
                        getObjStub.get.withArgs('secret').returns('not_available');
                        getObjStub.get.withArgs('status').returns('enabled');

                        updateClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            getObjStub.get.calledOnce.should.be.true();
                            getObjStub.get.calledWith('secret').should.be.true();

                            clientEditStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(
                                clientOneStub, getObjStub.get, loggerStub.info, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });
                });

                describe('05-add-ghost-frontend-client', function () {
                    var addClient = fixtures004[4];

                    it('tries to add client correctly', function (done) {
                        var clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());
                        clientOneStub.returns(Promise.resolve());

                        addClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-frontend'}).should.be.true();
                            clientAddStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(clientOneStub, loggerStub.info, clientAddStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to add client if it already exists', function (done) {
                        var clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());

                        addClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-frontend'}).should.be.true();
                            clientAddStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        }).catch(done);
                    });
                });

                describe('06-clean-broken-tags', function () {
                    var tagObjStub, tagCollStub, tagAllStub,
                        cleanBrokenTags = fixtures004[5];

                    beforeEach(function () {
                        tagObjStub = {
                            get: sandbox.stub(),
                            save: sandbox.stub().returns(Promise.resolve)
                        };
                        tagCollStub = {each: sandbox.stub().callsArgWith(0, tagObjStub)};
                        tagAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(tagCollStub));
                    });

                    it('tries to clean broken tags correctly', function (done) {
                        tagObjStub.get.returns(',hello');

                        cleanBrokenTags({}, loggerStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.calledOnce.should.be.true();
                            tagObjStub.save.calledWith({name: 'hello'}).should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get, tagObjStub.save, loggerStub.info);

                            done();
                        }).catch(done);
                    });

                    it('tries can handle tags which end up empty', function (done) {
                        tagObjStub.get.returns(',');

                        cleanBrokenTags({}, loggerStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.calledOnce.should.be.true();
                            tagObjStub.save.calledWith({name: 'tag'}).should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get, tagObjStub.save, loggerStub.info);

                            done();
                        }).catch(done);
                    });

                    it('does not change tags if not necessary', function (done) {
                        tagObjStub.get.returns('hello');

                        cleanBrokenTags({}, loggerStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get, loggerStub.warn);

                            done();
                        }).catch(done);
                    });

                    it('does nothing if there are no tags', function (done) {
                        tagAllStub.returns(Promise.resolve());

                        cleanBrokenTags({}, loggerStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.called.should.be.false();
                            tagObjStub.get.called.should.be.false();
                            tagObjStub.save.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();
                            sinon.assert.callOrder(tagAllStub, loggerStub.warn);

                            done();
                        }).catch(done);
                    });
                });

                describe('07-add-post-tag-order', function () {
                    var tagOp1Stub, tagOp2Stub, tagObjStub, postObjStub, postCollStub, postAllStub,
                        addPostTagOrder = fixtures004[6];

                    beforeEach(function () {
                        tagOp1Stub = sandbox.stub().returns(Promise.resolve());
                        tagOp2Stub = sandbox.stub().returns(Promise.resolve());
                        tagObjStub = {
                            pivot: {get: sandbox.stub()}
                        };
                        postCollStub = {mapThen: sandbox.stub()};
                        postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub));

                        postObjStub = {
                            load: sandbox.stub(),
                            reduce: sandbox.stub(),
                            // By returning an array from related, we can use native reduce to simulate a result
                            related: sandbox.stub().returns([tagObjStub]),
                            // Get called when executing sequence
                            tags: sandbox.stub().returnsThis(),
                            updatePivot: sandbox.stub().returns(Promise.resolve())
                        };
                    });

                    it('calls load on each post', function (done) {
                        // Fake mapThen behaviour
                        postCollStub.mapThen.callsArgWith(0, postObjStub).returns([]);
                        addPostTagOrder({}, loggerStub).then(function () {
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.load.calledOnce.should.be.true();
                            postObjStub.load.calledWith(['tags']).should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            // gets called because we're stubbing to return an empty array
                            loggerStub.warn.calledOnce.should.be.true();
                            sinon.assert.callOrder(loggerStub.info, postAllStub, postCollStub.mapThen,  postObjStub.load);

                            done();
                        }).catch(done);
                    });

                    it('returns early, if no posts are found', function (done) {
                        // Fake mapThen behaviour
                        postCollStub.mapThen.returns([]);
                        postAllStub.returns(Promise.resolve());

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.calledOnce.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(loggerStub.info, postAllStub, loggerStub.warn);

                            done();
                        }).catch(done);
                    });

                    it('executes sequence, if at least one tag is found', function (done) {
                        var tagOpStub = sandbox.stub().returns(Promise.resolve()),
                            tagOpsArr = [tagOpStub];

                        // By stubbing reduce, we can return an array directly without pretending to process tags
                        postObjStub.reduce.returns(tagOpsArr);
                        // By returning from mapThen, we can skip doing tag.load in this test
                        postCollStub.mapThen.returns(postObjStub);

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledThrice.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.reduce.calledOnce.should.be.true();
                            tagOpStub.calledOnce.should.be.true();

                            sinon.assert.callOrder(
                                loggerStub.info, postAllStub, postCollStub.mapThen, postObjStub.reduce,
                                loggerStub.info, tagOpStub, loggerStub.info
                            );

                            done();
                        }).catch(done);
                    });

                    it('executes sequence, if more than one tag is found', function (done) {
                        var tagOpsArr = [tagOp1Stub, tagOp2Stub];
                        // By stubbing reduce, we can return an array directly without pretending to process tags
                        postObjStub.reduce.returns(tagOpsArr);
                        // By returning from mapThen, we can skip doing tag.load in this test
                        postCollStub.mapThen.returns(postObjStub);

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledThrice.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.reduce.calledOnce.should.be.true();
                            tagOp1Stub.calledOnce.should.be.true();
                            tagOp2Stub.calledOnce.should.be.true();

                            sinon.assert.callOrder(
                                loggerStub.info, postAllStub, postCollStub.mapThen, postObjStub.reduce,
                                loggerStub.info, tagOp1Stub, tagOp2Stub, loggerStub.info
                            );

                            done();
                        }).catch(done);
                    });

                    it('does not execute sequence, if migrationHasRunFlag gets set to true', function (done) {
                        tagObjStub.pivot.get.returns(1);
                        // By returning from mapThen, we can skip doing tag.load in this test
                        postCollStub.mapThen.returns([postObjStub]);

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.calledOnce.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.related.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledWith('sort_order').should.be.true();
                            sinon.assert.callOrder(
                                loggerStub.info, postAllStub, postCollStub.mapThen, postObjStub.related,
                                tagObjStub.pivot.get, loggerStub.warn
                            );

                            done();
                        }).catch(done);
                    });

                    it('does execute sequence, if migrationHasRunFlag is false', function (done) {
                        // If pivot gets a non-zero, migrationHasRunFlag gets set to true
                        tagObjStub.pivot.get.returns(0);
                        // By returning from mapThen, we can skip doing tag.load in this test
                        postCollStub.mapThen.returns([postObjStub]);

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledThrice.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.related.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledWith('sort_order').should.be.true();

                            postObjStub.tags.calledOnce.should.be.true();
                            postObjStub.updatePivot.calledOnce.should.be.true();
                            sinon.assert.callOrder(
                                loggerStub.info, postAllStub, postCollStub.mapThen, postObjStub.related, tagObjStub.pivot.get,
                                loggerStub.info, postObjStub.tags, postObjStub.updatePivot, loggerStub.info
                            );

                            done();
                        }).catch(done);
                    });

                    it('tries to add incremental sort_order to posts_tags', function (done) {
                        // If pivot gets a non-zero, migrationHasRunFlag gets set to true
                        tagObjStub.pivot.get.returns(0);
                        // By returning an array from related, we can use real reduce to simulate a result here
                        postObjStub.related.returns([tagObjStub, tagObjStub, tagObjStub]);
                        // By returning from mapThen, we can skip doing tag.load in this test
                        postCollStub.mapThen.returns([postObjStub]);

                        addPostTagOrder({}, loggerStub).then(function () {
                            loggerStub.info.calledThrice.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.related.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledThrice.should.be.true();

                            postObjStub.tags.calledThrice.should.be.true();
                            postObjStub.updatePivot.calledThrice.should.be.true();

                            postObjStub.updatePivot.firstCall.args[0].should.eql({sort_order: 0});
                            postObjStub.updatePivot.secondCall.args[0].should.eql({sort_order: 1});
                            postObjStub.updatePivot.thirdCall.args[0].should.eql({sort_order: 2});

                            sinon.assert.callOrder(
                                loggerStub.info, postAllStub, postCollStub.mapThen, postObjStub.related,
                                tagObjStub.pivot.get, tagObjStub.pivot.get, tagObjStub.pivot.get,
                                loggerStub.info,
                                postObjStub.tags, postObjStub.updatePivot,
                                postObjStub.tags, postObjStub.updatePivot,
                                postObjStub.tags, postObjStub.updatePivot,
                                loggerStub.info
                            );

                            done();
                        }).catch(done);
                    });
                });

                describe('08-add-post-fixture', function () {
                    var postOneStub, postAddStub,
                        addPostFixture = fixtures004[7];

                    beforeEach(function () {
                        postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve());
                        postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve());
                    });

                    it('tries to add a new post fixture correctly', function (done) {
                        addPostFixture({}, loggerStub).then(function () {
                            postOneStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            postAddStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(postOneStub, loggerStub.info, postAddStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to add new post fixture if it already exists', function (done) {
                        postOneStub.returns(Promise.resolve({}));

                        addPostFixture({}, loggerStub).then(function () {
                            postOneStub.calledOnce.should.be.true();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();
                            postAddStub.called.should.be.false();

                            sinon.assert.callOrder(postOneStub, loggerStub.warn);

                            done();
                        }).catch(done);
                    });
                });
            });
        });

        describe('Update to 005', function () {
            it('should call all the 005 fixture upgrades', function (done) {
                // Setup
                // Create a new stub, this will replace sequence, so that db calls don't actually get run
                var sequenceStub = sandbox.stub(),
                    sequenceReset = update.__set__('sequence', sequenceStub),
                    tasks = versioning.getUpdateFixturesTasks('005', loggerStub);

                sequenceStub.returns(Promise.resolve([]));

                update(tasks, loggerStub, {transacting: transactionStub}).then(function (result) {
                    should.exist(result);

                    loggerStub.info.calledOnce.should.be.true();
                    loggerStub.warn.called.should.be.false();

                    sequenceStub.calledOnce.should.be.true();

                    sequenceStub.firstCall.calledWith(sinon.match.array, sinon.match.object, loggerStub).should.be.true();
                    sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(4);
                    sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'updateGhostClientsSecrets');
                    sequenceStub.firstCall.args[0][1].should.be.a.Function().with.property('name', 'addGhostFrontendClient');
                    sequenceStub.firstCall.args[0][2].should.be.a.Function().with.property('name', 'addClientPermissions');
                    sequenceStub.firstCall.args[0][3].should.be.a.Function().with.property('name', 'addSubscriberPermissions');

                    // Reset
                    sequenceReset();
                    done();
                }).catch(done);
            });

            describe('Tasks:', function () {
                it('should have tasks for 005', function () {
                    should.exist(fixtures005);
                    fixtures005.should.be.an.Array().with.lengthOf(4);
                });

                describe('01-update-ghost-client-secrets', function () {
                    var queryStub, clientForgeStub, clientEditStub,
                        updateClient = fixtures005[0];

                    beforeEach(function () {
                        queryStub = {
                            query: sandbox.stub().returnsThis(),
                            fetch: sandbox.stub()
                        };

                        clientForgeStub = sandbox.stub(models.Clients, 'forge').returns(queryStub);
                        clientEditStub = sandbox.stub(models.Client, 'edit');
                    });

                    it('should do nothing if there are no incorrect secrets', function (done) {
                        // Setup
                        queryStub.fetch.returns(new Promise.resolve({models: []}));

                        // Execute
                        updateClient({}, loggerStub).then(function () {
                            clientForgeStub.calledOnce.should.be.true();
                            clientEditStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();
                            done();
                        }).catch(done);
                    });

                    it('should try to fix any incorrect secrets', function (done) {
                        // Setup
                        queryStub.fetch.returns(new Promise.resolve({models: [{id: 1}]}));

                        // Execute
                        updateClient({}, loggerStub).then(function () {
                            clientForgeStub.calledOnce.should.be.true();
                            clientEditStub.called.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            done();
                        }).catch(done);
                    });
                });

                describe('02-add-ghost-scheduler-client', function () {
                    var clientOneStub,
                        addClient = fixtures005[1];

                    beforeEach(function () {
                        clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve({}));
                    });

                    it('tries to add client correctly', function (done) {
                        var clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());
                        clientOneStub.returns(Promise.resolve());

                        addClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-scheduler'}).should.be.true();
                            clientAddStub.calledOnce.should.be.true();
                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.called.should.be.false();
                            sinon.assert.callOrder(clientOneStub, loggerStub.info, clientAddStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to add client if it already exists', function (done) {
                        var clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());

                        addClient({}, loggerStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-scheduler'}).should.be.true();
                            clientAddStub.called.should.be.false();
                            loggerStub.info.called.should.be.false();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        }).catch(done);
                    });
                });

                describe('03-add-client-permissions', function () {
                    var modelResult, addModelStub, relationResult, addRelationStub,
                        addClientPermissions = fixtures005[2];

                    beforeEach(function () {
                        modelResult = {expected: 1, done: 1};
                        addModelStub = sandbox.stub(fixtureUtils, 'addFixturesForModel')
                            .returns(Promise.resolve(modelResult));

                        relationResult = {expected: 1, done: 1};
                        addRelationStub = sandbox.stub(fixtureUtils, 'addFixturesForRelation')
                            .returns(Promise.resolve(relationResult));
                    });

                    it('should find the correct model & relation to add', function (done) {
                        // Execute
                        addClientPermissions({}, loggerStub).then(function () {
                            addModelStub.calledOnce.should.be.true();
                            addModelStub.calledWith(
                                fixtureUtils.findModelFixtures('Permission', {object_type: 'client'})
                            ).should.be.true();

                            addRelationStub.calledOnce.should.be.true();
                            addRelationStub.calledWith(
                                fixtureUtils.findPermissionRelationsForObject('client')
                            ).should.be.true();

                            loggerStub.info.calledTwice.should.be.true();
                            loggerStub.warn.called.should.be.false();

                            done();
                        });
                    });

                    it('should warn the result shows less work was done than expected', function (done) {
                        // Setup
                        modelResult.expected = 3;
                        // Execute
                        addClientPermissions({}, loggerStub).then(function () {
                            addModelStub.calledOnce.should.be.true();
                            addModelStub.calledWith(
                                fixtureUtils.findModelFixtures('Permission', {object_type: 'client'})
                            ).should.be.true();

                            addRelationStub.calledOnce.should.be.true();
                            addRelationStub.calledWith(
                                fixtureUtils.findPermissionRelationsForObject('client')
                            ).should.be.true();

                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        });
                    });
                });

                describe('04-add-subscriber-permissions', function () {
                    var modelResult, addModelStub, relationResult, addRelationStub,
                        addSubscriberPermissions = fixtures005[3];

                    beforeEach(function () {
                        modelResult = {expected: 1, done: 1};
                        addModelStub = sandbox.stub(fixtureUtils, 'addFixturesForModel')
                            .returns(Promise.resolve(modelResult));

                        relationResult = {expected: 1, done: 1};
                        addRelationStub = sandbox.stub(fixtureUtils, 'addFixturesForRelation')
                            .returns(Promise.resolve(relationResult));
                    });

                    it('should find the correct model & relation to add', function (done) {
                        // Execute
                        addSubscriberPermissions({}, loggerStub).then(function () {
                            addModelStub.calledOnce.should.be.true();
                            addModelStub.calledWith(
                                fixtureUtils.findModelFixtures('Permission', {object_type: 'subscriber'})
                            ).should.be.true();

                            addRelationStub.calledOnce.should.be.true();
                            addRelationStub.calledWith(
                                fixtureUtils.findPermissionRelationsForObject('subscriber')
                            ).should.be.true();

                            loggerStub.info.calledTwice.should.be.true();
                            loggerStub.warn.called.should.be.false();

                            done();
                        });
                    });

                    it('should warn the result shows less work was done than expected', function (done) {
                        // Setup
                        modelResult.expected = 3;
                        // Execute
                        addSubscriberPermissions({}, loggerStub).then(function () {
                            addModelStub.calledOnce.should.be.true();
                            addModelStub.calledWith(
                                fixtureUtils.findModelFixtures('Permission', {object_type: 'subscriber'})
                            ).should.be.true();

                            addRelationStub.calledOnce.should.be.true();
                            addRelationStub.calledWith(
                                fixtureUtils.findPermissionRelationsForObject('subscriber')
                            ).should.be.true();

                            loggerStub.info.calledOnce.should.be.true();
                            loggerStub.warn.calledOnce.should.be.true();

                            done();
                        });
                    });
                });
            });
        });

        describe('Update to 006', function () {
            it('should call all the 006 fixture upgrades', function (done) {
                // Setup
                // Create a new stub, this will replace sequence, so that db calls don't actually get run
                var sequenceStub = sandbox.stub(),
                    sequenceReset = update.__set__('sequence', sequenceStub),
                    tasks = versioning.getUpdateFixturesTasks('006', loggerStub);

                sequenceStub.returns(Promise.resolve([]));

                update(tasks, loggerStub, {transacting:transactionStub}).then(function (result) {
                    should.exist(result);

                    loggerStub.info.calledOnce.should.be.true();
                    loggerStub.warn.called.should.be.false();

                    sequenceStub.calledOnce.should.be.true();

                    sequenceStub.firstCall.calledWith(sinon.match.array, sinon.match.object, loggerStub).should.be.true();
                    sequenceStub.firstCall.args[0].should.be.an.Array().with.lengthOf(1);
                    sequenceStub.firstCall.args[0][0].should.be.a.Function().with.property('name', 'transformDatesIntoUTC');

                    // Reset
                    sequenceReset();
                    done();
                }).catch(done);
            });

            describe('Tasks:', function () {
                it('should have tasks for 006', function () {
                    should.exist(fixtures006);
                    fixtures006.should.be.an.Array().with.lengthOf(1);
                });

                describe('01-transform-dates-into-utc', function () {
                    var updateClient = fixtures006[0],
                        serverTimezoneOffset,
                        migrationsSettingsValue;

                    beforeEach(function () {
                        configUtils.config.database.isPostgreSQL = function () {
                            return false;
                        };

                        sandbox.stub(Date.prototype, 'getTimezoneOffset', function () {
                            return serverTimezoneOffset;
                        });
                    });

                    describe('error cases', function () {
                        before(function () {
                            serverTimezoneOffset = 0;
                        });

                        beforeEach(function () {
                            sandbox.stub(models.Settings, 'findOne', function () {
                                return Promise.resolve({attributes: {value: migrationsSettingsValue}});
                            });
                        });

                        it('server offset is 0', function (done) {
                            migrationsSettingsValue = '{}';

                            updateClient({}, loggerStub)
                                .then(function () {
                                    loggerStub.warn.called.should.be.true();
                                    done();
                                })
                                .catch(done);
                        });

                        it('migration already ran', function (done) {
                            migrationsSettingsValue = '{ "006/01": "timestamp" }';

                            updateClient({}, loggerStub)
                                .then(function () {
                                    loggerStub.warn.called.should.be.true();
                                    done();
                                })
                                .catch(done);
                        });
                    });

                    describe('success cases', function () {
                        var newModels, createdAt, migrationsSettingsWasUpdated;

                        before(function () {
                            serverTimezoneOffset = -60;
                            migrationsSettingsValue = '{}';
                        });

                        beforeEach(function () {
                            newModels = {};
                            migrationsSettingsWasUpdated = false;
                            serverTimezoneOffset = -60;
                            migrationsSettingsValue = '{}';

                            sandbox.stub(models.Settings.prototype, 'fetch', function () {
                                // CASE: we update migrations settings entry
                                if (this.get('key') === 'migrations') {
                                    migrationsSettingsWasUpdated = true;
                                    return Promise.resolve(newModels[Object.keys(newModels)[0]]);
                                }

                                return Promise.resolve(newModels[Number(this.get('key'))]);
                            });

                            sandbox.stub(models.Base.Model.prototype, 'save', function (data) {
                                if (data.key !== 'migrations') {
                                    should.exist(data.created_at);
                                }

                                return Promise.resolve({});
                            });

                            _.each(['Post', 'User', 'Subscriber', 'Settings', 'Role', 'Permission', 'Tag', 'App', 'AppSetting', 'AppField', 'Client'], function (modelType) {
                                sandbox.stub(models[modelType], 'findAll', function () {
                                    var model = models[modelType].forge();
                                    model.set('id', Date.now());
                                    model.set('created_at', createdAt);
                                    model.set('key', model.id.toString());

                                    newModels[model.id] = model;
                                    return Promise.resolve({models: [model]});
                                });

                                if (modelType !== 'Settings') {
                                    sandbox.stub(models[modelType], 'findOne', function (data) {
                                        return Promise.resolve(newModels[data.id]);
                                    });
                                }

                                sandbox.stub(models[modelType], 'edit').returns(Promise.resolve({}));
                            });
                        });

                        it('sqlite: no UTC update, only format', function (done) {
                            createdAt = moment(1464798678537).toDate();
                            configUtils.config.database.client = 'sqlite3';

                            moment(createdAt).format('YYYY-MM-DD HH:mm:ss').should.eql('2016-06-01 16:31:18');

                            updateClient({}, loggerStub)
                                .then(function () {
                                    _.each(newModels, function (model) {
                                        moment(model.get('created_at')).format('YYYY-MM-DD HH:mm:ss').should.eql('2016-06-01 16:31:18');
                                    });

                                    migrationsSettingsWasUpdated.should.eql(true);
                                    done();
                                })
                                .catch(done);
                        });

                        it('mysql: UTC update', function (done) {
                            /**
                             * we fetch 2016-06-01 06:00:00 from the database which was stored as local representation
                             * our base model will wrap it into a UTC moment
                             * the offset is 1 hour
                             * we expect 2016-06-01 05:00:00
                             */
                            createdAt = moment('2016-06-01 06:00:00').toDate();
                            configUtils.config.database.client = 'mysql';

                            moment(createdAt).format('YYYY-MM-DD HH:mm:ss').should.eql('2016-06-01 06:00:00');

                            updateClient({}, loggerStub)
                                .then(function () {
                                    _.each(newModels, function (model) {
                                        moment(model.get('created_at')).format('YYYY-MM-DD HH:mm:ss').should.eql('2016-06-01 05:00:00');
                                    });

                                    migrationsSettingsWasUpdated.should.eql(true);
                                    done();
                                })
                                .catch(done);
                        });
                    });
                });
            });
        });
    });

    describe('Populate fixtures', function () {
        // This tests that all the models & relations get called correctly
        it('should call all the fixture populations', function (done) {
            // Stub all the model methods so that nothing happens
            var postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve()),
                tagAddStub = sandbox.stub(models.Tag, 'add').returns(Promise.resolve()),
                roleAddStub = sandbox.stub(models.Role, 'add').returns(Promise.resolve()),
                clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve()),
                permsAddStub = sandbox.stub(models.Permission, 'add').returns(Promise.resolve()),

            // Existence checks
                postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve()),
                tagOneStub = sandbox.stub(models.Tag, 'findOne').returns(Promise.resolve()),
                roleOneStub = sandbox.stub(models.Role, 'findOne').returns(Promise.resolve()),
                clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve()),
                permOneStub = sandbox.stub(models.Permission, 'findOne').returns(Promise.resolve()),

            // Relations
                fromItem = {
                    related: sandbox.stub().returnsThis(),
                    findWhere: sandbox.stub().returns({})
                },
                toItem = [{get: sandbox.stub()}],
                modelMethodStub = {filter: sandbox.stub().returns(toItem), find: sandbox.stub().returns(fromItem)},
                permsAllStub = sandbox.stub(models.Permission, 'findAll').returns(Promise.resolve(modelMethodStub)),
                rolesAllStub = sandbox.stub(models.Role, 'findAll').returns(Promise.resolve(modelMethodStub)),
                postsAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(modelMethodStub)),
                tagsAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(modelMethodStub)),

            // Create Owner
                userAddStub = sandbox.stub(models.User, 'add').returns(Promise.resolve({}));
            roleOneStub.onCall(4).returns(Promise.resolve({id: 1}));

            populate(loggerStub).then(function () {
                loggerStub.info.calledTwice.should.be.true();
                loggerStub.warn.called.should.be.false();

                postOneStub.calledOnce.should.be.true();
                postAddStub.calledOnce.should.be.true();
                tagOneStub.calledOnce.should.be.true();
                tagAddStub.calledOnce.should.be.true();
                roleOneStub.callCount.should.be.aboveOrEqual(4);
                roleAddStub.callCount.should.eql(4);
                clientOneStub.calledThrice.should.be.true();
                clientAddStub.calledThrice.should.be.true();

                permOneStub.callCount.should.eql(40);
                permsAddStub.called.should.be.true();
                permsAddStub.callCount.should.eql(40);

                permsAllStub.calledOnce.should.be.true();
                rolesAllStub.calledOnce.should.be.true();
                postsAllStub.calledOnce.should.be.true();
                tagsAllStub.calledOnce.should.be.true();

                // Relations
                modelMethodStub.filter.called.should.be.true();
                // 26 permissions, 1 tag
                modelMethodStub.filter.callCount.should.eql(28 + 1);
                modelMethodStub.find.called.should.be.true();
                // 3 roles, 1 post
                modelMethodStub.find.callCount.should.eql(3 + 1);

                // Create Owner
                roleOneStub.callCount.should.eql(5);
                userAddStub.calledOnce.should.be.true();

                done();
            }).catch(done);
        });

        describe('Create Owner', function () {
            var createOwner = populate.__get__('createOwner'),
                roleOneStub, userAddStub;

            beforeEach(function () {
                roleOneStub = sandbox.stub(models.Role, 'findOne');
                userAddStub = sandbox.stub(models.User, 'add');
            });

            it('createOwner will add user if owner role is present', function (done) {
                roleOneStub.returns(Promise.resolve({id: 1}));
                userAddStub.returns(Promise.resolve({}));

                createOwner(loggerStub).then(function () {
                    loggerStub.info.called.should.be.true();
                    loggerStub.warn.called.should.be.false();
                    roleOneStub.calledOnce.should.be.true();
                    userAddStub.called.should.be.true();

                    done();
                }).catch(done);
            });

            it('createOwner does not add user if owner role is not present', function (done) {
                roleOneStub.returns(Promise.resolve());
                userAddStub.returns(Promise.resolve({}));

                createOwner().then(function () {
                    roleOneStub.calledOnce.should.be.true();
                    userAddStub.called.should.be.false();

                    done();
                }).catch(done);
            });
        });
    });
});
