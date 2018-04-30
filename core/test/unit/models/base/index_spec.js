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
});
