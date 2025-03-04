const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');

describe('Models: crud', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('destroy', function () {
        it('forges model using destroyBy, fetches it, and calls destroy, passing filtered options', function () {
            const unfilteredOptions = {
                destroyBy: {
                    prop: 'whatever'
                }
            };
            const model = models.Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(models.Base.Model, 'filterOptions');
            const forgeStub = sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sinon.stub(model, 'destroy');

            return models.Base.Model.destroy(unfilteredOptions).then(() => {
                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'destroy');

                should.deepEqual(forgeStub.args[0][0], {
                    prop: 'whatever'
                });

                const filteredOptions = filterOptionsSpy.returnValues[0];

                should.equal(fetchStub.args[0][0], filteredOptions);
                should.equal(destroyStub.args[0][0], filteredOptions);
            });
        });

        it('uses options.id to forge model, if no destroyBy is provided', function () {
            const unfilteredOptions = {
                id: 23
            };
            const model = models.Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(models.Base.Model, 'filterOptions');
            const forgeStub = sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sinon.stub(model, 'destroy');

            return models.Base.Model.destroy(unfilteredOptions).then(() => {
                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'destroy');

                should.deepEqual(forgeStub.args[0][0], {
                    id: 23
                });

                const filteredOptions = filterOptionsSpy.returnValues[0];

                should.equal(fetchStub.args[0][0], filteredOptions);
                should.equal(destroyStub.args[0][0], filteredOptions);
            });
        });
    });

    describe('findOne', function () {
        it('forges model using filtered data, fetches it passing filtered options and resolves with the fetched model', function () {
            const data = {
                id: 670
            };
            const unfilteredOptions = {
                donny: 'donson'
            };
            const model = models.Base.Model.forge({});
            const fetchedModel = models.Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(models.Base.Model, 'filterData');
            const forgeStub = sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(fetchedModel);

            const findOneReturnValue = models.Base.Model.findOne(data, unfilteredOptions);

            return findOneReturnValue.then((result) => {
                should.equal(result, fetchedModel);

                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'findOne');

                should.equal(filterDataSpy.args[0][0], data);

                const filteredData = filterDataSpy.returnValues[0];
                should.deepEqual(forgeStub.args[0][0], filteredData);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                should.equal(fetchStub.args[0][0], filteredOptions);
            });
        });

        it('Sets the `lock` option to "forUpdate" when the `forUpdate` and `transacting` options are passed', async function () {
            const data = {
                id: 670
            };
            const unfilteredOptions = {
                donny: 'donson',
                forUpdate: true,
                transacting: {}
            };
            const model = models.Base.Model.forge({});
            const fetchedModel = models.Base.Model.forge({});
            sinon.spy(models.Base.Model, 'filterOptions');
            sinon.spy(models.Base.Model, 'filterData');
            sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(fetchedModel);

            await models.Base.Model.findOne(data, unfilteredOptions);

            should.equal(fetchStub.args[0][0].lock, 'forUpdate');
        });
    });

    describe('edit', function () {
        it('resolves with the savedModel after forges model w/ id, fetches w/ filtered options, saves w/ filtered data and options and method=update', function () {
            const data = {
                life: 'suffering'
            };
            const unfilteredOptions = {
                id: 'something real special'
            };
            const model = models.Base.Model.forge({});
            const savedModel = models.Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(models.Base.Model, 'filterData');
            const forgeStub = sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const saveStub = sinon.stub(model, 'save')
                .resolves(savedModel);

            return models.Base.Model.edit(data, unfilteredOptions).then((result) => {
                should.equal(result, savedModel);

                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'edit');

                should.equal(filterDataSpy.args[0][0], data);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                should.deepEqual(forgeStub.args[0][0], {id: filteredOptions.id});

                should.equal(fetchStub.args[0][0], filteredOptions);
                should.equal(fetchStub.args[0][0].lock, undefined);

                const filteredData = filterDataSpy.returnValues[0];
                should.equal(saveStub.args[0][0], filteredData);
                should.equal(saveStub.args[0][1].method, 'update');
                should.deepEqual(saveStub.args[0][1], filteredOptions);
            });
        });

        it('sets options.lock to "forUpdate" if options.transacting is present', function () {
            const data = {
                base: 'cannon'
            };
            const unfilteredOptions = {
                transacting: {}
            };

            const model = models.Base.Model.forge({});
            sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves();

            return models.Base.Model.findOne(data, unfilteredOptions).then(() => {
                should.equal(fetchStub.args[0][0].lock, undefined);
            });
        });

        it('sets model.hasTimestamps to false if options.importing is truthy', function () {
            const data = {
                base: 'cannon'
            };
            const unfilteredOptions = {
                importing: true
            };
            const model = models.Base.Model.forge({});
            sinon.stub(models.Base.Model, 'forge').returns(model);
            sinon.stub(model, 'fetch').resolves();

            return models.Base.Model.findOne(data, unfilteredOptions).then(() => {
                should.equal(model.hasTimestamps, true);
            });
        });

        it('throws an error if model cannot be found on edit', function () {
            const data = {
                db: 'cooper'
            };
            const unfilteredOptions = {
                id: 'something real special'
            };
            const model = models.Base.Model.forge({});
            sinon.spy(models.Base.Model, 'filterOptions');
            sinon.spy(models.Base.Model, 'filterData');
            sinon.stub(models.Base.Model, 'forge').returns(model);
            sinon.stub(model, 'fetch').resolves();
            sinon.stub(model, 'save');

            return models.Base.Model.edit(data, unfilteredOptions).then(() => {
                throw new Error('That should not happen');
            }).catch((err) => {
                (err instanceof errors.NotFoundError).should.be.true();
            });
        });
    });

    describe('add', function () {
        it('forges model w/ filtered data,  saves w/ null and options and method=insert', function () {
            const data = {
                rum: 'ham'
            };
            const unfilteredOptions = {};
            const model = models.Base.Model.forge({});
            const savedModel = models.Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(models.Base.Model, 'filterData');
            const forgeStub = sinon.stub(models.Base.Model, 'forge')
                .returns(model);
            const saveStub = sinon.stub(model, 'save')
                .resolves(savedModel);

            return models.Base.Model.add(data, unfilteredOptions).then((result) => {
                should.equal(result, savedModel);

                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'add');

                should.equal(filterDataSpy.args[0][0], data);

                const filteredData = filterDataSpy.returnValues[0];
                should.deepEqual(forgeStub.args[0][0], filteredData);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                should.equal(saveStub.args[0][0], null);
                should.equal(saveStub.args[0][1].method, 'insert');
                should.deepEqual(saveStub.args[0][1], filteredOptions);
            });
        });

        it('sets model.hasTimestamps to false if options.importing is truthy', function () {
            const data = {
                newham: 'generals'
            };
            const unfilteredOptions = {
                importing: true
            };
            const model = models.Base.Model.forge({});
            sinon.stub(models.Base.Model, 'forge').returns(model);
            sinon.stub(model, 'save').resolves();

            return models.Base.Model.add(data, unfilteredOptions).then(() => {
                should.equal(model.hasTimestamps, false);
            });
        });
    });
});
