var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    models = require('../../../../server/models'),
    ghostBookshelf,
    testUtils = require('../../../utils'),

    sandbox = sinon.sandbox.create();

describe('Models: base', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('fn: sanitizeData', function () {
        it('date is invalid', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({updated_at: '0000-00-00 00:00:00'});

            try {
                models.Base.Model.sanitizeData
                    .bind({prototype: {tableName: 'posts'}})(data);
            } catch (err) {
                err.code.should.eql('DATE_INVALID');
            }
        });

        it('expect date transformation', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({updated_at: '2018-04-01 07:53:07'});

            data.updated_at.should.be.a.String();

            models.Base.Model.sanitizeData
                .bind({prototype: {tableName: 'posts'}})(data);

            data.updated_at.should.be.a.Date();
        });

        it('date is JS date, ignore', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({updated_at: new Date()});

            data.updated_at.should.be.a.Date();

            models.Base.Model.sanitizeData
                .bind({prototype: {tableName: 'posts'}})(data);

            data.updated_at.should.be.a.Date();
        });

        it('expect date transformation for nested relations', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({
                authors: [{
                    name: 'Thomas',
                    updated_at: '2018-04-01 07:53:07'
                }]
            });

            data.authors[0].updated_at.should.be.a.String();

            models.Base.Model.sanitizeData
                .bind({
                    prototype: {
                        tableName: 'posts',
                        relationships: ['authors'],
                        relationshipBelongsTo: {authors: 'users'}
                    }
                })(data);

            data.authors[0].name.should.eql('Thomas');
            data.authors[0].updated_at.should.be.a.Date();
        });
    });

    describe('fn: setEmptyValuesToNull', function () {
        it('resets given empty value to null', function () {
            const base = models.Base.Model.forge({a: '', b: ''});

            base.emptyStringProperties = sandbox.stub();
            base.emptyStringProperties.returns(['a']);

            base.get('a').should.eql('');
            base.get('b').should.eql('');
            base.setEmptyValuesToNull();
            should.not.exist(base.get('a'));
            base.get('b').should.eql('');
        });

        it('does not reset to null if model does\'t provide properties', function () {
            const base = models.Base.Model.forge({a: ''});
            base.get('a').should.eql('');
            base.setEmptyValuesToNull();
            base.get('a').should.eql('');
        });
    });

    describe('static destroy()', function () {
        it('forges model using destroyBy, fetches it, and calls destroy, passing filtered options', function () {
            const unfilteredOptions = {
                destroyBy: {
                    prop: 'whatever'
                }
            };
            const model = models.Base.Model.forge({});
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sandbox.stub(model, 'destroy');

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
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves(model);
            const destroyStub = sandbox.stub(model, 'destroy');

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
});
