/*global describe, it, beforeEach, afterEach */
var should  = require('should'),
    sinon   = require('sinon'),
    rewire  = require('rewire'),
    Promise = require('bluebird'),

    // Stuff we are testing
    configUtils   = require('../utils/configUtils'),
    models        = require('../../server/models'),
    notifications = require('../../server/api/notifications'),
    versioning    = require('../../server/data/schema/versioning'),
    update        = rewire('../../server/data/migration/fixtures/update'),
    populate      = rewire('../../server/data/migration/fixtures/populate'),
    fixtures004   = require('../../server/data/migration/fixtures/004'),
    ensureDefaultSettings = require('../../server/data/migration/fixtures/settings'),

    sandbox       = sinon.sandbox.create();

describe('Fixtures', function () {
    beforeEach(function (done) {
        models.init().then(function () {
            done();
        });
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('Update fixtures', function () {
        it('should call `getUpdateFixturesTasks` when upgrading from 003 -> 004', function (done) {
            var logStub = sandbox.stub(),
                getVersionTasksStub = sandbox.stub(versioning, 'getUpdateFixturesTasks').returns([]);

            update(['004'], logStub).then(function () {
                logStub.calledOnce.should.be.true();
                getVersionTasksStub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        it('should NOT call `getUpdateFixturesTasks` when upgrading from 004 -> 004', function (done) {
            var logStub = sandbox.stub(),
                getVersionTasksStub = sandbox.stub(versioning, 'getUpdateFixturesTasks').returns([]);

            update([], logStub).then(function () {
                logStub.calledOnce.should.be.true();
                getVersionTasksStub.calledOnce.should.be.false();
                done();
            }).catch(done);
        });

        it('should call tasks in correct order if provided', function (done) {
            var logStub = sandbox.stub(),
                task1Stub = sandbox.stub().returns(Promise.resolve()),
                task2Stub = sandbox.stub().returns(Promise.resolve()),
                getVersionTasksStub = sandbox.stub(versioning, 'getUpdateFixturesTasks').returns([task1Stub, task2Stub]);

            update(['000'], logStub).then(function () {
                logStub.calledTwice.should.be.true();
                getVersionTasksStub.calledOnce.should.be.true();
                task1Stub.calledOnce.should.be.true();
                task2Stub.calledOnce.should.be.true();
                done();
            }).catch(done);
        });

        describe('Update to 004', function () {
            it('should call all the 004 fixture upgrades', function (done) {
                // Stub all the model methods so that nothing happens
                var logStub = sandbox.stub(),
                    settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(Promise.resolve()),
                    settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve()),
                    clientOneStub = sandbox.stub(models.Client, 'findOne'),
                    clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve()),
                    clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve()),
                    tagAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve()),
                    postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve()),
                    postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve({})),
                    postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve());

                clientOneStub.withArgs({slug: 'ghost-admin'}).returns(Promise.resolve());
                clientOneStub.withArgs({slug: 'ghost-frontend'}).returns(Promise.resolve({}));

                update(['004'], logStub).then(function (result) {
                    should.exist(result);

                    logStub.called.should.be.true();
                    settingsOneStub.calledThrice.should.be.true();
                    settingsEditStub.called.should.be.false();
                    clientOneStub.calledTwice.should.be.true();
                    clientEditStub.called.should.be.false();
                    clientAddStub.called.should.be.false();
                    tagAllStub.calledOnce.should.be.true();
                    postAllStub.calledOnce.should.be.true();
                    postOneStub.calledOnce.should.be.true();
                    postAddStub.called.should.be.false();

                    sinon.assert.callOrder(
                        settingsOneStub, settingsOneStub, settingsOneStub, clientOneStub, clientOneStub, tagAllStub,
                        postAllStub, postOneStub
                    );

                    done();
                }).catch(done);
            });

            describe('Tasks:', function () {
                describe('01-move-jquery-with-alert', function () {
                    it('tries to move jQuery to ghost_foot', function (done) {
                        var logStub = sandbox.stub(),
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(Promise.resolve({
                            attributes: {value: ''}
                        })),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[0]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();

                            done();
                        });
                    });

                    it('does not move jQuery to ghost_foot if it is already there', function (done) {
                        var logStub = sandbox.stub(),
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(Promise.resolve({
                                attributes: {
                                    value: '<!-- You can safely delete this line if your theme does not require jQuery -->\n'
                                        + '<script type="text/javascript" src="https://code.jquery.com/jquery-1.11.3.min.js"></script>\n\n'
                                }
                            })),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[0]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.false();
                            logStub.called.should.be.false();

                            done();
                        }).catch(done);
                    });

                    it('tried to move jQuery AND add a privacy message if any privacy settings are on', function (done) {
                        configUtils.set({privacy: {useGoogleFonts: false}});
                        var logStub = sandbox.stub(),
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(Promise.resolve({
                                attributes: {value: ''}
                            })),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve()),
                            notificationsAddStub = sandbox.stub(notifications, 'add').returns(Promise.resolve());

                        fixtures004[0]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('ghost_foot').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            notificationsAddStub.calledOnce.should.be.true();
                            logStub.calledTwice.should.be.true();

                            done();
                        }).catch(done);
                    });
                });

                describe('02-update-private-setting-type', function () {
                    it('tries to update setting type correctly', function (done) {
                        var logStub = sandbox.stub(),
                            settingObjStub = {get: sandbox.stub()},
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(
                                Promise.resolve(settingObjStub)
                            ),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[1]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('isPrivate').should.be.true();
                            settingObjStub.get.calledOnce.should.be.true();
                            settingObjStub.get.calledWith('type').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            settingsEditStub.calledWith({key: 'isPrivate', type: 'private'}).should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(settingsOneStub, settingObjStub.get, logStub, settingsEditStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to update setting type if it is already set', function (done) {
                        var logStub = sandbox.stub(),
                            settingObjStub = {get: sandbox.stub().returns('private')},
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(
                                Promise.resolve(settingObjStub)
                            ),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[1]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('isPrivate').should.be.true();
                            settingObjStub.get.calledOnce.should.be.true();
                            settingObjStub.get.calledWith('type').should.be.true();

                            settingsEditStub.called.should.be.false();
                            logStub.calledOnce.should.be.false();

                            sinon.assert.callOrder(settingsOneStub, settingObjStub.get);

                            done();
                        }).catch(done);
                    });
                });

                describe('03-update-password-setting-type', function () {
                    it('tries to update setting type correctly', function (done) {
                        var logStub = sandbox.stub(),
                            settingObjStub = {get: sandbox.stub()},
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(
                                Promise.resolve(settingObjStub)
                            ),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[2]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('password').should.be.true();
                            settingsEditStub.calledOnce.should.be.true();
                            settingsEditStub.calledWith({key: 'password', type: 'private'}).should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(settingsOneStub, logStub, settingsEditStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to update setting type if it is already set', function (done) {
                        var logStub = sandbox.stub(),
                            settingObjStub = {get: sandbox.stub().returns('private')},
                            settingsOneStub = sandbox.stub(models.Settings, 'findOne').returns(
                                Promise.resolve(settingObjStub)
                            ),
                            settingsEditStub = sandbox.stub(models.Settings, 'edit').returns(Promise.resolve());

                        fixtures004[2]({}, logStub).then(function () {
                            settingsOneStub.calledOnce.should.be.true();
                            settingsOneStub.calledWith('password').should.be.true();
                            settingObjStub.get.calledOnce.should.be.true();
                            settingObjStub.get.calledWith('type').should.be.true();

                            settingsEditStub.called.should.be.false();
                            logStub.calledOnce.should.be.false();

                            sinon.assert.callOrder(settingsOneStub, settingObjStub.get);

                            done();
                        }).catch(done);
                    });
                });

                describe('04-update-ghost-admin-client', function () {
                    it('tries to update client correctly', function (done) {
                        var logStub = sandbox.stub(),
                            clientObjStub = {get: sandbox.stub()},
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(clientObjStub)),
                            clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve());

                        fixtures004[3]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            clientObjStub.get.calledTwice.should.be.true();
                            clientObjStub.get.calledWith('secret').should.be.true();
                            clientObjStub.get.calledWith('status').should.be.true();
                            clientEditStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(
                                clientOneStub, clientObjStub.get, clientObjStub.get, logStub, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('does not try to update client if the secret and status are already correct', function (done) {
                        var logStub = sandbox.stub(),
                            clientObjStub = {get: sandbox.stub()},
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(clientObjStub)),
                            clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve());

                        clientObjStub.get.withArgs('secret').returns('abc');
                        clientObjStub.get.withArgs('status').returns('enabled');

                        fixtures004[3]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            clientObjStub.get.calledTwice.should.be.true();
                            clientObjStub.get.calledWith('secret').should.be.true();
                            clientObjStub.get.calledWith('status').should.be.true();
                            clientEditStub.called.should.be.false();
                            logStub.called.should.be.false();
                            sinon.assert.callOrder(clientOneStub, clientObjStub.get, clientObjStub.get);

                            done();
                        }).catch(done);
                    });

                    it('tries to update client if secret is correct but status is wrong', function (done) {
                        var logStub = sandbox.stub(),
                            clientObjStub = {get: sandbox.stub()},
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(clientObjStub)),
                            clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve());

                        clientObjStub.get.withArgs('secret').returns('abc');
                        clientObjStub.get.withArgs('status').returns('development');

                        fixtures004[3]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            clientObjStub.get.calledTwice.should.be.true();
                            clientObjStub.get.calledWith('secret').should.be.true();
                            clientObjStub.get.calledWith('status').should.be.true();

                            clientEditStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(
                                clientOneStub, clientObjStub.get, clientObjStub.get, logStub, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('tries to update client if status is correct but secret is wrong', function (done) {
                        var logStub = sandbox.stub(),
                            clientObjStub = {get: sandbox.stub()},
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve(clientObjStub)),
                            clientEditStub = sandbox.stub(models.Client, 'edit').returns(Promise.resolve());

                        clientObjStub.get.withArgs('secret').returns('not_available');
                        clientObjStub.get.withArgs('status').returns('enabled');

                        fixtures004[3]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-admin'}).should.be.true();
                            clientObjStub.get.calledOnce.should.be.true();
                            clientObjStub.get.calledWith('secret').should.be.true();

                            clientEditStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(
                                clientOneStub, clientObjStub.get, logStub, clientEditStub
                            );

                            done();
                        }).catch(done);
                    });
                });

                describe('05-add-ghost-frontend-client', function () {
                    it('tries to add client correctly', function (done) {
                        var logStub = sandbox.stub(),
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve()),
                            clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());

                        fixtures004[4]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-frontend'}).should.be.true();
                            clientAddStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(clientOneStub, logStub, clientAddStub);

                            done();
                        }).catch(done);
                    });

                    it('does not try to add client if it already exists', function (done) {
                        var logStub = sandbox.stub(),
                            clientOneStub = sandbox.stub(models.Client, 'findOne').returns(Promise.resolve({})),
                            clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve());

                        fixtures004[4]({}, logStub).then(function () {
                            clientOneStub.calledOnce.should.be.true();
                            clientOneStub.calledWith({slug: 'ghost-frontend'}).should.be.true();
                            clientAddStub.called.should.be.false();
                            logStub.called.should.be.false();

                            done();
                        }).catch(done);
                    });
                });

                describe('06-clean-broken-tags', function () {
                    it('tries to clean broken tags correctly', function (done) {
                        var logStub = sandbox.stub(),
                            tagObjStub = {
                                get: sandbox.stub().returns(',hello'),
                                save: sandbox.stub().returns(Promise.resolve)
                            },
                            tagCollStub = {each: sandbox.stub().callsArgWith(0, tagObjStub)},
                            tagAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(tagCollStub));

                        fixtures004[5]({}, logStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.calledOnce.should.be.true();
                            tagObjStub.save.calledWith({name: 'hello'}).should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get, tagObjStub.save, logStub);

                            done();
                        }).catch(done);
                    });

                    it('tries can handle tags which end up empty', function (done) {
                        var logStub = sandbox.stub(),
                            tagObjStub = {
                                get: sandbox.stub().returns(','),
                                save: sandbox.stub().returns(Promise.resolve)
                            },
                            tagCollStub = {each: sandbox.stub().callsArgWith(0, tagObjStub)},
                            tagAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(tagCollStub));

                        fixtures004[5]({}, logStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.calledOnce.should.be.true();
                            tagObjStub.save.calledWith({name: 'tag'}).should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get, tagObjStub.save, logStub);

                            done();
                        }).catch(done);
                    });

                    it('does not change tags if not necessary', function (done) {
                        var logStub = sandbox.stub(),
                            tagObjStub = {
                                get: sandbox.stub().returns('hello'),
                                save: sandbox.stub().returns(Promise.resolve)
                            },
                            tagCollStub = {each: sandbox.stub().callsArgWith(0, tagObjStub)},
                            tagAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(tagCollStub));

                        fixtures004[5]({}, logStub).then(function () {
                            tagAllStub.calledOnce.should.be.true();
                            tagCollStub.each.calledOnce.should.be.true();
                            tagObjStub.get.calledOnce.should.be.true();
                            tagObjStub.get.calledWith('name').should.be.true();
                            tagObjStub.save.called.should.be.false();
                            logStub.calledOnce.should.be.false();
                            sinon.assert.callOrder(tagAllStub, tagCollStub.each, tagObjStub.get);

                            done();
                        }).catch(done);
                    });
                });

                describe('07-add-post-tag-order', function () {
                    it('calls load on each post', function (done) {
                        var postObjStub = {
                                load: sandbox.stub()
                            },
                            postCollStub = {mapThen: sandbox.stub().callsArgWith(0, postObjStub).returns([])},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.load.calledOnce.should.be.true();
                            postObjStub.load.calledWith(['tags']).should.be.true();
                            logStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(logStub, postAllStub, postCollStub.mapThen,  postObjStub.load);

                            done();
                        }).catch(done);
                    });

                    it('returns early, if no posts are found', function (done) {
                        var postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve()),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledOnce.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(logStub, postAllStub);

                            done();
                        }).catch(done);
                    });

                    it('executes sequence, if at least one tag is found', function (done) {
                        var tagOpStub = sandbox.stub().returns(Promise.resolve()),
                            tagOpsArr = [tagOpStub],
                            // By stubbing reduce, we can return an array directly without pretending to process tags
                            postArrayReduceStub = {
                                reduce: sandbox.stub().returns(tagOpsArr)
                            },
                            // By returning from mapThen, we can skip doing tag.load in this test
                            postCollStub = {mapThen: sandbox.stub().returns(postArrayReduceStub)},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledThrice.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postArrayReduceStub.reduce.calledOnce.should.be.true();
                            tagOpStub.calledOnce.should.be.true();

                            sinon.assert.callOrder(
                                logStub, postAllStub, postCollStub.mapThen, postArrayReduceStub.reduce,
                                logStub, tagOpStub, logStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('executes sequence, if more than one tag is found', function (done) {
                        var tagOp1Stub = sandbox.stub().returns(Promise.resolve()),
                            tagOp2Stub = sandbox.stub().returns(Promise.resolve()),
                            tagOpsArr = [tagOp1Stub, tagOp2Stub],
                            // By stubbing reduce, we can return an array directly without pretending to process tags
                            postArrayReduceStub = {
                                reduce: sandbox.stub().returns(tagOpsArr)
                            },
                            // By returning from mapThen, we can skip doing tag.load in this test
                            postCollStub = {mapThen: sandbox.stub().returns(postArrayReduceStub)},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledThrice.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postArrayReduceStub.reduce.calledOnce.should.be.true();
                            tagOp1Stub.calledOnce.should.be.true();
                            tagOp2Stub.calledOnce.should.be.true();

                            sinon.assert.callOrder(
                                logStub, postAllStub, postCollStub.mapThen, postArrayReduceStub.reduce,
                                logStub, tagOp1Stub, tagOp2Stub, logStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('does not execute sequence, if migrationHasRunFlag gets set to true', function (done) {
                        var tagObjStub = {
                                pivot: {
                                    // If pivot gets a non-zero, migrationHasRunFlag gets set to true
                                    get: sandbox.stub().returns(1)
                                }
                            },
                            postObjStub = {
                                // By returning an array from related, we can use real reduce to simulate a result here
                                related: sandbox.stub().returns([tagObjStub])
                            },
                            // By returning from mapThen, we can skip doing tag.load in this test
                            postCollStub = {mapThen: sandbox.stub().returns([postObjStub])},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledOnce.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.related.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledWith('sort_order').should.be.true();
                            sinon.assert.callOrder(
                                logStub, postAllStub, postCollStub.mapThen, postObjStub.related, tagObjStub.pivot.get
                            );

                            done();
                        }).catch(done);
                    });

                    it('does execute sequence, if migrationHasRunFlag is false', function (done) {
                        var tagObjStub = {
                                pivot: {
                                    // If pivot gets a non-zero, migrationHasRunFlag gets set to true
                                    get: sandbox.stub().returns(0)
                                }
                            },
                            postObjStub = {
                                // By returning an array from related, we can use real reduce to simulate a result here
                                related: sandbox.stub().returns([tagObjStub]),

                                // Get called when executing the sequence
                                tags: sandbox.stub().returnsThis(),
                                updatePivot: sandbox.stub().returns(Promise.resolve())
                            },
                            // By returning from mapThen, we can skip doing tag.load in this test
                            postCollStub = {mapThen: sandbox.stub().returns([postObjStub])},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledThrice.should.be.true();
                            postAllStub.calledOnce.should.be.true();
                            postCollStub.mapThen.calledOnce.should.be.true();
                            postObjStub.related.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledOnce.should.be.true();
                            tagObjStub.pivot.get.calledWith('sort_order').should.be.true();

                            postObjStub.tags.calledOnce.should.be.true();
                            postObjStub.updatePivot.calledOnce.should.be.true();
                            sinon.assert.callOrder(
                                logStub, postAllStub, postCollStub.mapThen, postObjStub.related, tagObjStub.pivot.get,
                                logStub, postObjStub.tags, postObjStub.updatePivot, logStub
                            );

                            done();
                        }).catch(done);
                    });

                    it('tries to add incremental sort_order to posts_tags', function (done) {
                        var tagObjStub = {
                                pivot: {
                                    // If pivot gets a non-zero, migrationHasRunFlag gets set to true
                                    get: sandbox.stub().returns(0)
                                }
                            },
                            postObjStub = {
                                // By returning an array from related, we can use real reduce to simulate a result here
                                related: sandbox.stub().returns([tagObjStub, tagObjStub, tagObjStub]),

                                // Get called when executing the sequence
                                tags: sandbox.stub().returnsThis(),
                                updatePivot: sandbox.stub().returns(Promise.resolve())
                            },
                        // By returning from mapThen, we can skip doing tag.load in this test
                            postCollStub = {mapThen: sandbox.stub().returns([postObjStub])},
                            postAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(postCollStub)),
                            logStub = sandbox.stub();

                        fixtures004[6]({}, logStub).then(function () {
                            logStub.calledThrice.should.be.true();
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
                                logStub, postAllStub, postCollStub.mapThen, postObjStub.related,
                                tagObjStub.pivot.get, tagObjStub.pivot.get, tagObjStub.pivot.get,
                                logStub,
                                postObjStub.tags, postObjStub.updatePivot,
                                postObjStub.tags, postObjStub.updatePivot,
                                postObjStub.tags, postObjStub.updatePivot,
                                logStub
                            );

                            done();
                        }).catch(done);
                    });
                });

                describe('08-add-post-fixture', function () {
                    it('tries to add a new post fixture correctly', function (done) {
                        var logStub = sandbox.stub(),
                            postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve()),
                            postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve());

                        fixtures004[7]({}, logStub).then(function () {
                            postOneStub.calledOnce.should.be.true();
                            logStub.calledOnce.should.be.true();
                            postAddStub.calledOnce.should.be.true();
                            sinon.assert.callOrder(postOneStub, logStub, postAddStub);

                            done();
                        }).catch(done);
                    });
                });

                it('does not try to add new post fixture if it already exists', function (done) {
                    var logStub = sandbox.stub(),
                        postOneStub = sandbox.stub(models.Post, 'findOne').returns(Promise.resolve({})),
                        postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve());

                    fixtures004[7]({}, logStub).then(function () {
                        postOneStub.calledOnce.should.be.true();
                        logStub.called.should.be.false();
                        postAddStub.called.should.be.false();

                        done();
                    }).catch(done);
                });
            });
        });
    });

    describe('Populate fixtures', function () {
        // This tests that all the models & relations get called correctly
        it('should call all the fixture populations', function (done) {
            // Stub all the model methods so that nothing happens
            var logStub = sandbox.stub(),
                postAddStub = sandbox.stub(models.Post, 'add').returns(Promise.resolve()),
                tagAddStub = sandbox.stub(models.Tag, 'add').returns(Promise.resolve()),
                roleAddStub = sandbox.stub(models.Role, 'add').returns(Promise.resolve()),
                clientAddStub = sandbox.stub(models.Client, 'add').returns(Promise.resolve()),
                permsAddStub = sandbox.stub(models.Permission, 'add').returns(Promise.resolve()),

            // Relations
                modelMethodStub = {filter: sandbox.stub(), find: sandbox.stub()},
                permsAllStub = sandbox.stub(models.Permission, 'findAll').returns(Promise.resolve(modelMethodStub)),
                rolesAllStub = sandbox.stub(models.Role, 'findAll').returns(Promise.resolve(modelMethodStub)),
                postsAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(modelMethodStub)),
                tagsAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(modelMethodStub)),

            // Create Owner
                roleOneStub = sandbox.stub(models.Role, 'findOne').returns(Promise.resolve({id: 1})),
                userAddStub = sandbox.stub(models.User, 'add').returns(Promise.resolve({}));

            populate(logStub).then(function () {
                logStub.called.should.be.true();

                postAddStub.calledOnce.should.be.true();
                tagAddStub.calledOnce.should.be.true();
                roleAddStub.callCount.should.eql(4);
                clientAddStub.calledTwice.should.be.true();

                permsAddStub.called.should.be.true();
                permsAddStub.callCount.should.eql(30);

                permsAllStub.calledOnce.should.be.true();
                rolesAllStub.calledOnce.should.be.true();
                postsAllStub.calledOnce.should.be.true();
                tagsAllStub.calledOnce.should.be.true();

                // Relations
                modelMethodStub.filter.called.should.be.true();
                // 22 permissions, 1 tag
                modelMethodStub.filter.callCount.should.eql(22 + 1);
                modelMethodStub.find.called.should.be.true();
                // 3 roles, 1 post
                modelMethodStub.find.callCount.should.eql(3 + 1);

                // Create Owner
                roleOneStub.calledOnce.should.be.true();
                userAddStub.calledOnce.should.be.true();

                done();
            }).catch(done);
        });

        describe('Add All Relations', function () {
            it('should call attach if relation models are found', function (done) {
                var addAllRelations = populate.__get__('addAllRelations'),
                    emptyMethodStub = {filter: sandbox.stub(), find: sandbox.stub()},
                // Setup a chain of methods
                    dataMethodStub = {
                        filter: sandbox.stub().returnsThis(),
                        find: sandbox.stub().returnsThis(),
                        tags: sandbox.stub().returnsThis(),
                        attach: sandbox.stub().returns(Promise.resolve())
                    },
                    permsAllStub = sandbox.stub(models.Permission, 'findAll').returns(Promise.resolve(emptyMethodStub)),
                    rolesAllStub = sandbox.stub(models.Role, 'findAll').returns(Promise.resolve(emptyMethodStub)),
                    postsAllStub = sandbox.stub(models.Post, 'findAll').returns(Promise.resolve(dataMethodStub)),
                    tagsAllStub = sandbox.stub(models.Tag, 'findAll').returns(Promise.resolve(dataMethodStub));

                addAllRelations().then(function () {
                    permsAllStub.calledOnce.should.be.true();
                    rolesAllStub.calledOnce.should.be.true();
                    postsAllStub.calledOnce.should.be.true();
                    tagsAllStub.calledOnce.should.be.true();

                    // Permissions & Roles
                    emptyMethodStub.filter.called.should.be.true();
                    emptyMethodStub.filter.callCount.should.eql(22);
                    emptyMethodStub.find.called.should.be.true();
                    emptyMethodStub.find.callCount.should.eql(3);

                    // Posts & Tags
                    dataMethodStub.filter.calledOnce.should.be.true();
                    dataMethodStub.find.calledOnce.should.be.true();
                    dataMethodStub.tags.calledOnce.should.be.true();
                    dataMethodStub.attach.calledOnce.should.be.true();
                    dataMethodStub.attach.calledWith(dataMethodStub).should.be.true();

                    done();
                }).catch(done);
            });
        });

        describe('Create Owner', function () {
            it('createOwner will add user if owner role is present', function (done) {
                var createOwner = populate.__get__('createOwner'),
                    logStub = sandbox.stub(),
                    roleOneStub = sandbox.stub(models.Role, 'findOne').returns(Promise.resolve({id: 1})),
                    userAddStub = sandbox.stub(models.User, 'add').returns(Promise.resolve({}));

                createOwner(logStub).then(function () {
                    logStub.called.should.be.true();
                    roleOneStub.calledOnce.should.be.true();
                    userAddStub.called.should.be.true();

                    done();
                }).catch(done);
            });

            it('createOwner does not add user if owner role is not present', function (done) {
                var createOwner = populate.__get__('createOwner'),
                    roleOneStub = sandbox.stub(models.Role, 'findOne').returns(Promise.resolve()),
                    userAddStub = sandbox.stub(models.User, 'add').returns(Promise.resolve({}));

                createOwner().then(function () {
                    roleOneStub.calledOnce.should.be.true();
                    userAddStub.called.should.be.false();

                    done();
                }).catch(done);
            });
        });

        describe('Match Func', function () {
            var matchFunc = populate.__get__('matchFunc');

            it('should match undefined with no args', function () {
                var getStub = sandbox.stub();

                matchFunc()({get: getStub}).should.be.true();
                getStub.calledOnce.should.be.true();
                getStub.calledWith(undefined).should.be.true();
            });

            it('should match key with match string', function () {
                var getStub = sandbox.stub();
                getStub.withArgs('foo').returns('bar');

                matchFunc('foo', 'bar')({get: getStub}).should.be.true();
                getStub.calledOnce.should.be.true();
                getStub.calledWith('foo').should.be.true();

                matchFunc('foo', 'buz')({get: getStub}).should.be.false();
                getStub.calledTwice.should.be.true();
                getStub.secondCall.calledWith('foo').should.be.true();
            });

            it('should match value when key is 0', function () {
                var getStub = sandbox.stub();
                getStub.withArgs('foo').returns('bar');

                matchFunc('foo', 0, 'bar')({get: getStub}).should.be.true();
                getStub.calledOnce.should.be.true();
                getStub.calledWith('foo').should.be.true();

                matchFunc('foo', 0, 'buz')({get: getStub}).should.be.false();
                getStub.calledTwice.should.be.true();
                getStub.secondCall.calledWith('foo').should.be.true();
            });

            it('should match key & value when match is array', function () {
                var getStub = sandbox.stub();
                getStub.withArgs('foo').returns('bar');
                getStub.withArgs('fun').returns('baz');

                matchFunc(['foo', 'fun'], 'bar', 'baz')({get: getStub}).should.be.true();
                getStub.calledTwice.should.be.true();
                getStub.getCall(0).calledWith('fun').should.be.true();
                getStub.getCall(1).calledWith('foo').should.be.true();

                matchFunc(['foo', 'fun'], 'baz', 'bar')({get: getStub}).should.be.false();
                getStub.callCount.should.eql(4);
                getStub.getCall(2).calledWith('fun').should.be.true();
                getStub.getCall(3).calledWith('foo').should.be.true();
            });

            it('should match key only when match is array, but value is all', function () {
                var getStub = sandbox.stub();
                getStub.withArgs('foo').returns('bar');
                getStub.withArgs('fun').returns('baz');

                matchFunc(['foo', 'fun'], 'bar', 'all')({get: getStub}).should.be.true();
                getStub.calledOnce.should.be.true();
                getStub.calledWith('foo').should.be.true();

                matchFunc(['foo', 'fun'], 'all', 'bar')({get: getStub}).should.be.false();
                getStub.callCount.should.eql(3);
                getStub.getCall(1).calledWith('fun').should.be.true();
                getStub.getCall(2).calledWith('foo').should.be.true();
            });

            it('should match key & value when match and value are arrays', function () {
                var getStub = sandbox.stub();
                getStub.withArgs('foo').returns('bar');
                getStub.withArgs('fun').returns('baz');

                matchFunc(['foo', 'fun'], 'bar', ['baz', 'buz'])({get: getStub}).should.be.true();
                getStub.calledTwice.should.be.true();
                getStub.getCall(0).calledWith('fun').should.be.true();
                getStub.getCall(1).calledWith('foo').should.be.true();

                matchFunc(['foo', 'fun'], 'bar', ['biz', 'buz'])({get: getStub}).should.be.false();
                getStub.callCount.should.eql(4);
                getStub.getCall(2).calledWith('fun').should.be.true();
                getStub.getCall(3).calledWith('foo').should.be.true();
            });
        });
    });

    describe('Ensure default settings', function () {
        it('should call populate settings and provide messaging', function (done) {
            var settingsStub = sandbox.stub(models.Settings, 'populateDefaults').returns(new Promise.resolve()),
                logStub = sandbox.stub();

            ensureDefaultSettings(logStub).then(function () {
                settingsStub.calledOnce.should.be.true();
                logStub.calledTwice.should.be.true();

                done();
            });
        });
    });
});
