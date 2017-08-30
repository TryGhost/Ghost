var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),

    // Stuff we are testing
    SettingsModel = require('../../../server/models/settings').Settings,
    db = require('../../../server/data/db'),
    events = require('../../../server/events'),
    context = testUtils.context.admin,
    internalContext = testUtils.context.internal,
    sandbox = sinon.sandbox.create();

describe('Settings Model', function () {
    var eventSpy;

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('settings'));

    before(function () {
        should.exist(SettingsModel);
    });

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        eventSpy = sandbox.spy(events, 'emit');
    });

    describe('API', function () {
        it('can findAll', function (done) {
            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                done();
            }).catch(done);
        });

        it('can findOne', function (done) {
            var firstSetting;

            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                return SettingsModel.findOne(firstSetting.attributes.key);
            }).then(function (found) {
                should.exist(found);

                should(found.get('value')).equal(firstSetting.attributes.value);
                found.get('created_at').should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

        it('can edit single', function (done) {
            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                return SettingsModel.edit({key: 'description', value: 'new value'}, context);
            }).then(function (edited) {
                should.exist(edited);

                edited.length.should.equal(1);

                edited = edited[0];

                edited.attributes.key.should.equal('description');
                edited.attributes.value.should.equal('new value');

                eventSpy.calledTwice.should.be.true();
                eventSpy.firstCall.calledWith('settings.edited').should.be.true();
                eventSpy.secondCall.calledWith('settings.description.edited').should.be.true();

                done();
            }).catch(done);
        });

        it('can edit readonly settings if internal context', function (done) {
            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                return SettingsModel.edit({key: 'scheduling', value: 'new value'}, internalContext);
            }).then(function (edited) {
                should.exist(edited);

                edited.length.should.equal(1);

                edited = edited[0];

                edited.attributes.key.should.equal('scheduling');
                edited.attributes.value.should.equal('new value');

                eventSpy.calledTwice.should.be.true();
                eventSpy.firstCall.calledWith('settings.edited').should.be.true();
                eventSpy.secondCall.calledWith('settings.scheduling.edited').should.be.true();

                done();
            }).catch(done);
        });

        it('can\'t edit readonly settings if internal context', function (done) {
            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                return SettingsModel.edit({key: 'scheduling', value: 'new value'}, context);
            }).then(function () {
                done(new Error('Expected error when editing a readonly key.'));
            }).catch(function () {
                done();
            });
        });

        it('can edit multiple', function (done) {
            var model1,
                model2,
                editedModel;

            SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                model1 = {key: 'description', value: 'another new value'};
                model2 = {key: 'title', value: 'new title'};

                return SettingsModel.edit([model1, model2], context);
            }).then(function (edited) {
                should.exist(edited);

                edited.length.should.equal(2);

                editedModel = edited[0];

                editedModel.attributes.key.should.equal(model1.key);
                editedModel.attributes.value.should.equal(model1.value);

                editedModel = edited[1];

                editedModel.attributes.key.should.equal(model2.key);
                editedModel.attributes.value.should.equal(model2.value);

                eventSpy.callCount.should.equal(4);

                // We can't rely on the order of updates.
                // We can however expect the first and third call to
                // to be `settings.edited`.
                eventSpy.firstCall.calledWith('settings.edited').should.be.true();
                eventSpy.thirdCall.calledWith('settings.edited').should.be.true();

                eventSpy.calledWith('settings.description.edited').should.be.true();
                eventSpy.calledWith('settings.title.edited').should.be.true();

                done();
            }).catch(done);
        });

        it('can add', function (done) {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            SettingsModel.add(newSetting, context).then(function (createdSetting) {
                should.exist(createdSetting);
                createdSetting.has('uuid').should.equal(false);
                createdSetting.attributes.key.should.equal(newSetting.key, 'key is correct');
                createdSetting.attributes.value.should.equal(newSetting.value, 'value is correct');
                createdSetting.attributes.type.should.equal('core');

                eventSpy.calledTwice.should.be.true();
                eventSpy.firstCall.calledWith('settings.added').should.be.true();
                eventSpy.secondCall.calledWith('settings.TestSetting1.added').should.be.true();

                done();
            }).catch(done);
        });

        it('can destroy', function (done) {
            SettingsModel.findAll().then(function (allSettings) {
                SettingsModel.findOne({id: allSettings.models[1].id}).then(function (results) {
                    should.exist(results);
                    results.attributes.id.should.equal(allSettings.models[1].id);
                    return SettingsModel.destroy({id: allSettings.models[1].id});
                }).then(function (response) {
                    response.toJSON().should.be.empty();
                    return SettingsModel.findOne({id: allSettings.models[1].id});
                }).then(function (newResults) {
                    should.equal(newResults, null);

                    done();
                }).catch(done);
            }).catch(done);
        });
    });

    describe('populating defaults from settings.json', function () {
        beforeEach(function (done) {
            db.knex('settings').truncate().then(function () {
                done();
            });
        });

        it('populates any unset settings from the JSON defaults', function (done) {
            SettingsModel.findAll().then(function (allSettings) {
                allSettings.length.should.equal(0);
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findAll();
            }).then(function (allSettings) {
                allSettings.length.should.be.above(0);

                return SettingsModel.findOne('description');
            }).then(function (descriptionSetting) {
                // Testing against the actual value in default-settings.json feels icky,
                // but it's easier to fix the test if that ever changes than to mock out that behaviour
                descriptionSetting.get('value').should.equal('The professional publishing platform');
                done();
            }).catch(done);
        });

        it('doesn\'t overwrite any existing settings', function (done) {
            SettingsModel.add({key: 'description', value: 'Adam\'s Blog'}, context).then(function () {
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findOne('description');
            }).then(function (descriptionSetting) {
                descriptionSetting.get('value').should.equal('Adam\'s Blog');
                done();
            }).catch(done);
        });
    });
});
