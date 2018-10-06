var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    security = require('../../../../server/lib/security'),
    models = require('../../../../server/models'),
    urlService = require('../../../../server/services/url'),
    filters = require('../../../../server/filters'),
    testUtils = require('../../../utils'),
    sandbox = sinon.sandbox.create();

describe('Models: base', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('generateSlug', function () {
        let Model;
        let options = {};

        beforeEach(function () {
            sandbox.stub(security.string, 'safe');
            sandbox.stub(filters, 'doFilter').resolves();
            sandbox.stub(urlService.utils, 'getProtectedSlugs').returns(['upsi', 'schwupsi']);

            Model = sandbox.stub();
            Model.prototype = {
                tableName: 'tableName'
            };
            Model.findOne = sandbox.stub();
        });

        it('default', function () {
            Model.findOne.resolves(false);
            security.string.safe.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', options)
                .then((slug) => {
                    slug.should.eql('my-slug');
                });
        });

        it('slug exists', function () {
            let i = 0;
            Model.findOne.callsFake(() => {
                i = i + 1;
                if (i === 1) {
                    return Promise.resolve(true);
                }
                return Promise.resolve(false);
            });

            security.string.safe.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', options)
                .then((slug) => {
                    slug.should.eql('my-slug-2');
                });
        });

        it('too long', function () {
            Model.findOne.resolves(false);
            const slug = new Array(500).join('a');

            security.string.safe.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((slug) => {
                    slug.should.eql(new Array(186).join('a'));
                });
        });

        it('protected slug', function () {
            Model.findOne.resolves(false);
            const slug = 'upsi';

            security.string.safe.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((slug) => {
                    slug.should.eql('upsi-tableName');
                });
        });

        it('internal tag', function () {
            Model.findOne.resolves(false);
            const slug = '#lul';

            Model.prototype = {
                tableName: 'tag'
            };

            security.string.safe.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((slug) => {
                    slug.should.eql('hash-#lul');
                });
        });
    });

    describe('sanitizeData', function () {
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

    describe('setEmptyValuesToNull', function () {
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

    describe('destroy', function () {
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
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sandbox.spy(models.Base.Model, 'filterData');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves(fetchedModel);

            const findOneReturnValue = models.Base.Model.findOne(data, unfilteredOptions);

            should.equal(findOneReturnValue, fetchStub.returnValues[0]);

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
    });

    describe('edit', function () {
        it('resolves with the savedModel after forges model w/ id, fetches w/ filtered options, saves w/ filtered data and options and method=update', function () {
            const data = {
                life: 'suffering'
            };
            const unfilteredOptions = {
                id: 'something real special',
            };
            const model = models.Base.Model.forge({});
            const savedModel = models.Base.Model.forge({});
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sandbox.spy(models.Base.Model, 'filterData');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves(model);
            const saveStub = sandbox.stub(model, 'save')
                .resolves(savedModel);

            return models.Base.Model.edit(data, unfilteredOptions).then((result) => {
                should.equal(result, savedModel);

                should.equal(filterOptionsSpy.args[0][0], unfilteredOptions);
                should.equal(filterOptionsSpy.args[0][1], 'edit');

                should.equal(filterDataSpy.args[0][0], data);

                const filteredOptions = filterOptionsSpy.returnValues[0];
                should.deepEqual(forgeStub.args[0][0], {id: filteredOptions.id});

                should.equal(fetchStub.args[0][0], filteredOptions);

                const filteredData = filterDataSpy.returnValues[0];
                should.equal(saveStub.args[0][0], filteredData);
                should.equal(saveStub.args[0][1].method, 'update');
                should.deepEqual(saveStub.args[0][1], filteredOptions);
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
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves();

            return models.Base.Model.findOne(data, unfilteredOptions).then(() => {
                should.equal(model.hasTimestamps, true);
            });
        });

        it('resolves with nothing and does not call save if no model is fetched', function () {
            const data = {
                db: 'cooper'
            };
            const unfilteredOptions = {
                id: 'something real special',
            };
            const model = models.Base.Model.forge({});
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sandbox.spy(models.Base.Model, 'filterData');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const fetchStub = sandbox.stub(model, 'fetch')
                .resolves();
            const saveSpy = sandbox.stub(model, 'save');

            return models.Base.Model.edit(data, unfilteredOptions).then((result) => {
                should.equal(result, undefined);
                should.equal(saveSpy.callCount, 0);
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
            const filterOptionsSpy = sandbox.spy(models.Base.Model, 'filterOptions');
            const filterDataSpy = sandbox.spy(models.Base.Model, 'filterData');
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const saveStub = sandbox.stub(model, 'save')
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
            const forgeStub = sandbox.stub(models.Base.Model, 'forge')
                .returns(model);
            const saveStub = sandbox.stub(model, 'save')
                .resolves();

            return models.Base.Model.add(data, unfilteredOptions).then(() => {
                should.equal(model.hasTimestamps, false);
            });
        });
    });
});
