const assert = require('node:assert/strict');
const should = require('should');
const sinon = require('sinon');
const security = require('@tryghost/security');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils');
const testUtils = require('../../../../utils');

describe('Models: base', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('generateSlug', function () {
        let Model;
        let options = {};
        let securityStringSafeStub;
        beforeEach(function () {
            securityStringSafeStub = sinon.stub(security.string, 'safe');
            sinon.stub(urlUtils, 'getProtectedSlugs').returns(['upsi', 'schwupsi']);

            Model = sinon.stub();
            Model.prototype = {
                tableName: 'tableName'
            };
            Model.findOne = sinon.stub();
        });

        it('default', function () {
            Model.findOne.resolves(false);
            securityStringSafeStub.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', options)
                .then((slug) => {
                    assert.equal(slug, 'my-slug');
                });
        });

        it('slug exists but it does not exist for the id', function () {
            let i = 0;
            Model.findOne.callsFake(() => {
                i = i + 1;
                if (i === 1) {
                    return Promise.resolve({id: 'correct-model-id'});
                }
                return Promise.resolve(null);
            });

            securityStringSafeStub.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', {modelId: 'incorrect-model-id'})
                .then((slug) => {
                    assert.equal(slug, 'my-slug-2');
                });
        });

        it('slug exists but it exists for the id', function () {
            let i = 0;
            Model.findOne.callsFake(() => {
                i = i + 1;
                if (i === 1) {
                    return Promise.resolve({id: 'correct-model-id'});
                }
                return Promise.resolve(null);
            });

            securityStringSafeStub.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', {modelId: 'correct-model-id'})
                .then((slug) => {
                    assert.equal(slug, 'my-slug');
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

            securityStringSafeStub.withArgs('My-Slug').returns('my-slug');

            return models.Base.Model.generateSlug(Model, 'My-Slug', options)
                .then((slug) => {
                    assert.equal(slug, 'my-slug-2');
                });
        });

        it('too long', function () {
            Model.findOne.resolves(false);
            const slug = 'a'.repeat(500);

            securityStringSafeStub.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((generatedSlug) => {
                    assert.equal(generatedSlug, 'a'.repeat(185));
                });
        });

        it('protected slug', function () {
            Model.findOne.resolves(false);
            const slug = 'upsi';

            securityStringSafeStub.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((generatedSlug) => {
                    assert.equal(generatedSlug, 'upsi-tableName');
                });
        });

        it('internal tag', function () {
            Model.findOne.resolves(false);
            const slug = '#lul';

            Model.prototype = {
                tableName: 'tag'
            };

            securityStringSafeStub.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((generatedSlug) => {
                    assert.equal(generatedSlug, 'hash-#lul');
                });
        });

        it('contains invisible unicode', function () {
            Model.findOne.resolves(false);
            securityStringSafeStub.withArgs('abc\u0008').returns('abc');

            return models.Base.Model.generateSlug(Model, 'abc\u0008', options)
                .then((slug) => {
                    assert.equal(slug, 'abc');
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
                assert.equal(err.code, 'DATE_INVALID');
            }
        });

        it('expect date transformation', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({updated_at: '2018-04-01 07:53:07'});

            assert.equal(typeof data.updated_at, 'string');

            models.Base.Model.sanitizeData
                .bind({prototype: {tableName: 'posts'}})(data);

            assert(data.updated_at instanceof Date);
        });

        it('date is JS date, ignore', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({updated_at: new Date()});

            assert(data.updated_at instanceof Date);

            models.Base.Model.sanitizeData
                .bind({prototype: {tableName: 'posts'}})(data);

            assert(data.updated_at instanceof Date);
        });

        it('expect date transformation for nested relations', function () {
            const data = testUtils.DataGenerator.forKnex.createPost({
                authors: [{
                    name: 'Thomas',
                    updated_at: '2018-04-01 07:53:07'
                }]
            });

            assert.equal(typeof data.authors[0].updated_at, 'string');

            models.Base.Model.sanitizeData
                .bind({
                    prototype: {
                        tableName: 'posts',
                        relationships: ['authors'],
                        relationshipBelongsTo: {authors: 'users'}
                    }
                })(data);

            assert.equal(data.authors[0].name, 'Thomas');
            assert(data.authors[0].updated_at instanceof Date);
        });
    });

    describe('setEmptyValuesToNull', function () {
        it('resets given empty value to null', function () {
            const base = models.Base.Model.forge({a: '', b: ''});

            base.getNullableStringProperties = sinon.stub();
            base.getNullableStringProperties.returns(['a']);

            assert.equal(base.get('a'), '');
            assert.equal(base.get('b'), '');
            base.setEmptyValuesToNull();
            assert.equal(base.get('a'), null);
            assert.equal(base.get('b'), '');
        });
    });
});
