const should = require('should');
const sinon = require('sinon');
const models = require('../../../../core/server/models');

describe('Unit: models/session', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('parse', function () {
        const parse = function parse(attrs) {
            return new models.Session().parse(attrs);
        };

        it('converts session_data to an object', function () {
            const attrs = {
                id: 'something',
                session_data: JSON.stringify({
                    some: 'data'
                })
            };
            const parsed = parse(attrs);
            should.equal(typeof parsed.session_data, 'object');
            should.equal(parsed.session_data.some, 'data');
        });
    });

    describe('format', function () {
        const format = function format(attrs) {
            return new models.Session().format(attrs);
        };

        it('converts session_data to a string', function () {
            const attrs = {
                id: 'something',
                session_data: {
                    some: 'data'
                }
            };
            const formatted = format(attrs);
            should.equal(typeof formatted.session_data, 'string');
            should.equal(formatted.session_data, JSON.stringify({
                some: 'data'
            }));
        });

        it('does not add session_data key if missing', function () {
            const attrs = {
                id: 'something'
            };
            const formatted = format(attrs);
            should.equal(formatted.session_data, undefined);
        });
    });

    describe('user', function () {
        it('sets up the relation to the "User" model', function () {
            const model = models.Session.forge({});
            const belongsToSpy = sinon.spy(model, 'belongsTo');
            model.user();

            should.equal(belongsToSpy.args[0][0], 'User');
        });
    });

    describe('permittedOptions', function () {
        let basePermittedOptionsReturnVal;
        let basePermittedOptionsStub;

        beforeEach(function () {
            basePermittedOptionsReturnVal = ['super', 'doopa'];
            basePermittedOptionsStub = sinon.stub(models.Base.Model, 'permittedOptions')
                .returns(basePermittedOptionsReturnVal);
        });

        it('passes the methodName and the context to the base permittedOptions method', function () {
            const methodName = 'methodName';
            models.Session.permittedOptions(methodName);

            should.equal(basePermittedOptionsStub.args[0][0], methodName);
            should.equal(basePermittedOptionsStub.thisValues[0], models.Session);
        });

        it('returns the base permittedOptions result', function () {
            const returnedOptions = models.Session.permittedOptions();

            should.deepEqual(returnedOptions, basePermittedOptionsReturnVal);
        });

        it('returns the base permittedOptions result plus "session_id" when methodName is upsert', function () {
            const returnedOptions = models.Session.permittedOptions('upsert');

            should.deepEqual(returnedOptions, basePermittedOptionsReturnVal.concat('session_id'));
        });

        it('returns the base permittedOptions result plus "session_id" when methodName is destroy', function () {
            const returnedOptions = models.Session.permittedOptions('destroy');

            should.deepEqual(returnedOptions, basePermittedOptionsReturnVal.concat('session_id'));
        });
    });

    describe('destroy', function () {
        it('calls and returns the Base Model destroy if an id is passed', function () {
            const baseDestroyReturnVal = {};
            const baseDestroyStub = sinon.stub(models.Base.Model, 'destroy')
                .returns(baseDestroyReturnVal);

            const options = {id: 1};
            const returnVal = models.Session.destroy(options);

            should.equal(baseDestroyStub.args[0][0], options);
            should.equal(returnVal, baseDestroyReturnVal);
        });

        it('calls forge with the session_id, fetchs with the filtered options and then destroys with the options', function (done) {
            const model = models.Session.forge({});
            const session_id = 23;
            const unfilteredOptions = {session_id};
            const filteredOptions = {session_id};

            const filterOptionsStub = sinon.stub(models.Session, 'filterOptions')
                .returns(filteredOptions);
            const forgeStub = sinon.stub(models.Session, 'forge')
                .returns(model);
            const fetchStub = sinon.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sinon.stub(model, 'destroy')
                .resolves();

            models.Session.destroy(unfilteredOptions).then(() => {
                should.equal(filterOptionsStub.args[0][0], unfilteredOptions);
                should.equal(filterOptionsStub.args[0][1], 'destroy');

                should.deepEqual(forgeStub.args[0][0], {session_id});

                should.equal(fetchStub.args[0][0], filteredOptions);
                should.equal(destroyStub.args[0][0], filteredOptions);

                done();
            });
        });
    });

    describe('upsert', function () {
        it('calls findOne and then add if findOne results in nothing', function (done) {
            const session_id = 314;
            const unfilteredOptions = {session_id};
            const filteredOptions = {session_id};
            const data = {
                session_data: {
                    user_id: 96
                }
            };

            const filterOptionsStub = sinon.stub(models.Session, 'filterOptions')
                .returns(filteredOptions);

            const findOneStub = sinon.stub(models.Session, 'findOne')
                .resolves();

            const addStub = sinon.stub(models.Session, 'add');

            models.Session.upsert(data, unfilteredOptions).then(() => {
                should.equal(filterOptionsStub.args[0][0], unfilteredOptions);
                should.equal(filterOptionsStub.args[0][1], 'upsert');

                should.deepEqual(findOneStub.args[0][0], {
                    session_id
                });
                should.equal(findOneStub.args[0][1], filteredOptions);

                should.deepEqual(addStub.args[0][0], {
                    session_id: filteredOptions.session_id,
                    session_data: data.session_data,
                    user_id: data.session_data.user_id
                });

                should.equal(addStub.args[0][1], filteredOptions);
                done();
            });
        });

        it('calls findOne and then edit if findOne results in nothing', function (done) {
            const model = models.Session.forge({id: 2});
            const session_id = 314;
            const unfilteredOptions = {session_id};
            const filteredOptions = {session_id};
            const data = {
                session_data: {
                    user_id: 96
                }
            };

            const filterOptionsStub = sinon.stub(models.Session, 'filterOptions')
                .returns(filteredOptions);

            const findOneStub = sinon.stub(models.Session, 'findOne')
                .resolves(model);

            const editStub = sinon.stub(models.Session, 'edit');

            models.Session.upsert(data, unfilteredOptions).then(() => {
                should.equal(filterOptionsStub.args[0][0], unfilteredOptions);
                should.equal(filterOptionsStub.args[0][1], 'upsert');

                should.deepEqual(findOneStub.args[0][0], {
                    session_id
                });
                should.equal(findOneStub.args[0][1], filteredOptions);

                should.deepEqual(editStub.args[0][0], {
                    session_data: data.session_data
                });

                should.deepEqual(editStub.args[0][1], {
                    session_id,
                    id: model.id
                });

                should.equal(editStub.args[0][1], filteredOptions);
                done();
            });
        });
    });
});
