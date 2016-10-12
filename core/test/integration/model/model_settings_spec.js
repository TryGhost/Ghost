var testUtils       = require('../../utils'),
    should          = require('should'),
    sinon           = require('sinon'),

    // Stuff we are testing
    SettingsModel   = require('../../../server/models/settings').Settings,
    db              = require('../../../server/data/db'),
    events          = require('../../../server/events'),
    sandbox         = sinon.sandbox.create(),
    context         = testUtils.context.admin;

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
        it('can findAll', function () {
            return SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);
            });
        });

        it('can findOne', function () {
            var firstSetting;

            return SettingsModel.findAll().then(function (results) {
                should.exist(results);

                results.length.should.be.above(0);

                firstSetting = results.models[0];

                return SettingsModel.findOne(firstSetting.attributes.key);
            }).then(function (found) {
                should.exist(found);

                should(found.get('value')).equal(firstSetting.attributes.value);
                found.get('created_at').should.be.an.instanceof(Date);
            });
        });

        it('can edit single', function () {
            return SettingsModel.findAll().then(function (results) {
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
            });
        });

        it('can edit multiple', function () {
            var model1,
                model2,
                editedModel;

            return SettingsModel.findAll().then(function (results) {
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
            });
        });

        it('can add', function () {
            var newSetting = {
                key: 'TestSetting1',
                value: 'Test Content 1'
            };

            SettingsModel.add(newSetting, context).then(function (createdSetting) {
                should.exist(createdSetting);
                createdSetting.has('uuid').should.equal(true);
                createdSetting.attributes.key.should.equal(newSetting.key, 'key is correct');
                createdSetting.attributes.value.should.equal(newSetting.value, 'value is correct');
                createdSetting.attributes.type.should.equal('core');

                eventSpy.calledTwice.should.be.true();
                eventSpy.firstCall.calledWith('settings.added').should.be.true();
                eventSpy.secondCall.calledWith('settings.TestSetting1.added').should.be.true();
            });
        });

        it('can destroy', function () {
            // dont't use id 1, since it will delete databaseversion
            var settingToDestroy = {id: 2};

            return SettingsModel.findOne(settingToDestroy).then(function (results) {
                should.exist(results);
                results.attributes.id.should.equal(settingToDestroy.id);

                return SettingsModel.destroy(settingToDestroy);
            }).then(function (response) {
                response.toJSON().should.be.empty();

                return SettingsModel.findOne(settingToDestroy);
            }).then(function (newResults) {
                should.equal(newResults, null);
            });
        });
    });

    describe('populating defaults from settings.json', function () {
        beforeEach(function () {
            return db.knex('settings').truncate();
        });

        it('populates any unset settings from the JSON defaults', function () {
            return SettingsModel.findAll().then(function (allSettings) {
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
                descriptionSetting.get('value').should.equal('Just a blogging platform.');
            });
        });

        it('doesn\'t overwrite any existing settings', function () {
            return SettingsModel.add({key: 'description', value: 'Adam\'s Blog'}, context).then(function () {
                return SettingsModel.populateDefaults();
            }).then(function () {
                return SettingsModel.findOne('description');
            }).then(function (descriptionSetting) {
                descriptionSetting.get('value').should.equal('Adam\'s Blog');
            });
        });
    });
});
