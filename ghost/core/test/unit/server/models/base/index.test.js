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

        beforeEach(function () {
            sinon.stub(security.string, 'safe');
            sinon.stub(urlUtils, 'getProtectedSlugs').returns(['upsi', 'schwupsi']);

            Model = sinon.stub();
            Model.prototype = {
                tableName: 'tableName'
            };
            Model.findOne = sinon.stub();
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
                .then((generatedSlug) => {
                    generatedSlug.should.eql(new Array(186).join('a'));
                });
        });

        it('protected slug', function () {
            Model.findOne.resolves(false);
            const slug = 'upsi';

            security.string.safe.withArgs(slug).returns(slug);

            return models.Base.Model.generateSlug(Model, slug, options)
                .then((generatedSlug) => {
                    generatedSlug.should.eql('upsi-tableName');
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
                .then((generatedSlug) => {
                    generatedSlug.should.eql('hash-#lul');
                });
        });

        it('contains invisible unicode', function () {
            Model.findOne.resolves(false);
            security.string.safe.withArgs('abc\u0008').returns('abc');

            return models.Base.Model.generateSlug(Model, 'abc\u0008', options)
                .then((slug) => {
                    slug.should.eql('abc');
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

            base.getNullableStringProperties = sinon.stub();
            base.getNullableStringProperties.returns(['a']);

            base.get('a').should.eql('');
            base.get('b').should.eql('');
            base.setEmptyValuesToNull();
            should.not.exist(base.get('a'));
            base.get('b').should.eql('');
        });
    });
});
