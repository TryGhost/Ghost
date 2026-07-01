const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const Base = require('../../../../../core/server/models/base');

describe('Models: crud', function () {
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
            const model = Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(Base.Model, 'filterOptions');
            const forgeStub = sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sinon.stub(model, 'destroy');

            return Base.Model.destroy(unfilteredOptions).then(() => {
                assert.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                assert.equal(filterOptionsSpy.args[0][1], 'destroy');

                assert.deepEqual(forgeStub.args[0][0], {
                    prop: 'whatever'
                });

                const filteredOptions = filterOptionsSpy.returnValues[0];

                assert.equal(fetchStub.args[0][0], filteredOptions);
                assert.equal(destroyStub.args[0][0], filteredOptions);
            });
        });

        it('uses options.id to forge model, if no destroyBy is provided', function () {
            const unfilteredOptions = {
                id: 23
            };
            const model = Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(Base.Model, 'filterOptions');
            const forgeStub = sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sinon.stub(model, 'destroy');

            return Base.Model.destroy(unfilteredOptions).then(() => {
                assert.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                assert.equal(filterOptionsSpy.args[0][1], 'destroy');

                assert.deepEqual(forgeStub.args[0][0], {
                    id: 23
                });

                const filteredOptions = filterOptionsSpy.returnValues[0];

                assert.equal(fetchStub.args[0][0], filteredOptions);
                assert.equal(destroyStub.args[0][0], filteredOptions);
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
            const model = Base.Model.forge({});
            const fetchedModel = Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(Base.Model, 'filterData');
            const forgeStub = sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(fetchedModel);

            const findOneReturnValue = Base.Model.findOne(data, unfilteredOptions);

            return findOneReturnValue.then((result) => {
                assert.equal(result, fetchedModel);

                assert.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                assert.equal(filterOptionsSpy.args[0][1], 'findOne');

                assert.equal(filterDataSpy.args[0][0], data);

                const filteredData = filterDataSpy.returnValues[0];
                assert.deepEqual(forgeStub.args[0][0], filteredData);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                assert.equal(fetchStub.args[0][0], filteredOptions);
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
            const model = Base.Model.forge({});
            const fetchedModel = Base.Model.forge({});
            sinon.spy(Base.Model, 'filterOptions');
            sinon.spy(Base.Model, 'filterData');
            sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(fetchedModel);

            await Base.Model.findOne(data, unfilteredOptions);

            assert.equal(fetchStub.args[0][0].lock, 'forUpdate');
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
            const model = Base.Model.forge({});
            const savedModel = Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(Base.Model, 'filterData');
            const forgeStub = sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const saveStub = sinon.stub(model, 'save')
                .resolves(savedModel);

            return Base.Model.edit(data, unfilteredOptions).then((result) => {
                assert.equal(result, savedModel);

                assert.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                assert.equal(filterOptionsSpy.args[0][1], 'edit');

                assert.equal(filterDataSpy.args[0][0], data);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                assert.deepEqual(forgeStub.args[0][0], {id: filteredOptions.id});

                assert.equal(fetchStub.args[0][0], filteredOptions);
                assert.equal(fetchStub.args[0][0].lock, undefined);

                const filteredData = filterDataSpy.returnValues[0];
                assert.equal(saveStub.args[0][0], filteredData);
                assert.equal(saveStub.args[0][1].method, 'update');
                assert.deepEqual(saveStub.args[0][1], filteredOptions);
            });
        });

        it('sets options.lock to "forUpdate" if options.transacting is present', function () {
            const data = {
                base: 'cannon'
            };
            const unfilteredOptions = {
                transacting: {}
            };

            const model = Base.Model.forge({});
            sinon.stub(Base.Model, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves();

            return Base.Model.findOne(data, unfilteredOptions).then(() => {
                assert.equal(fetchStub.args[0][0].lock, undefined);
            });
        });

        it('sets model.hasTimestamps to false if options.importing is truthy', function () {
            const data = {
                base: 'cannon'
            };
            const unfilteredOptions = {
                importing: true
            };
            const model = Base.Model.forge({});
            sinon.stub(Base.Model, 'forge').returns(model);
            sinon.stub(model, 'fetch').resolves();

            return Base.Model.findOne(data, unfilteredOptions).then(() => {
                assert.equal(model.hasTimestamps, true);
            });
        });

        it('throws an error if model cannot be found on edit', function () {
            const data = {
                db: 'cooper'
            };
            const unfilteredOptions = {
                id: 'something real special'
            };
            const model = Base.Model.forge({});
            sinon.spy(Base.Model, 'filterOptions');
            sinon.spy(Base.Model, 'filterData');
            sinon.stub(Base.Model, 'forge').returns(model);
            sinon.stub(model, 'fetch').resolves();
            sinon.stub(model, 'save');

            return Base.Model.edit(data, unfilteredOptions).then(() => {
                throw new Error('That should not happen');
            }).catch((err) => {
                assert.equal((err instanceof errors.NotFoundError), true);
            });
        });
    });

    describe('add', function () {
        it('forges model w/ filtered data,  saves w/ null and options and method=insert', function () {
            const data = {
                rum: 'ham'
            };
            const unfilteredOptions = {};
            const model = Base.Model.forge({});
            const savedModel = Base.Model.forge({});
            const filterOptionsSpy = sinon.spy(Base.Model, 'filterOptions');
            const filterDataSpy = sinon.spy(Base.Model, 'filterData');
            const forgeStub = sinon.stub(Base.Model, 'forge')
                .returns(model);
            const saveStub = sinon.stub(model, 'save')
                .resolves(savedModel);

            return Base.Model.add(data, unfilteredOptions).then((result) => {
                assert.equal(result, savedModel);

                assert.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                assert.equal(filterOptionsSpy.args[0][1], 'add');

                assert.equal(filterDataSpy.args[0][0], data);

                const filteredData = filterDataSpy.returnValues[0];
                assert.deepEqual(forgeStub.args[0][0], filteredData);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                assert.equal(saveStub.args[0][0], null);
                assert.equal(saveStub.args[0][1].method, 'insert');
                assert.deepEqual(saveStub.args[0][1], filteredOptions);
            });
        });

        it('sets model.hasTimestamps to false if options.importing is truthy', function () {
            const data = {
                newham: 'generals'
            };
            const unfilteredOptions = {
                importing: true
            };
            const model = Base.Model.forge({});
            sinon.stub(Base.Model, 'forge').returns(model);
            sinon.stub(model, 'save').resolves();

            return Base.Model.add(data, unfilteredOptions).then(() => {
                assert.equal(model.hasTimestamps, false);
            });
        });
    });
});
