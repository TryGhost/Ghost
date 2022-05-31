const should = require('should');
const sinon = require('sinon');
const models = require('../../../../../core/server/models');

describe('Models: getLazyRelation', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can fetch collections', async function () {
        var OtherModel = models.Base.Model.extend({
            tableName: 'other_models'
        });

        const TestModel = models.Base.Model.extend({
            tableName: 'test_models',
            tiers() {
                return this.belongsToMany(OtherModel, 'test_others', 'test_id', 'other_id');
            }
        });
        let rel = null;
        const fetchStub = sinon.stub(models.Base.Collection.prototype, 'fetch').callsFake(function () {
            if (rel !== null) {
                throw new Error('Called twice');
            }
            rel = this;
            return this;
        });

        const options = {test: true};
        const modelA = TestModel.forge({id: '1'});
        (await modelA.getLazyRelation('tiers', options)).should.eql(rel);
        fetchStub.calledOnceWithExactly(options).should.be.true();

        // Check if it can reuse it again
        (await modelA.getLazyRelation('tiers', options)).should.eql(rel);
        fetchStub.calledOnceWithExactly(options).should.be.true();

        // Check if we can force reload
        await should(modelA.getLazyRelation('tiers', {forceRefresh: true})).rejectedWith(/Called twice/);
        fetchStub.calledTwice.should.be.true();
    });

    it('can fetch models', async function () {
        var OtherModel = models.Base.Model.extend({
            tableName: 'other_models'
        });

        const TestModel = models.Base.Model.extend({
            tableName: 'test_models',
            other() {
                return this.belongsTo(OtherModel, 'other_id', 'id');
            }
        });
        let rel = null;
        const fetchStub = sinon.stub(OtherModel.prototype, 'fetch').callsFake(function () {
            if (rel !== null) {
                throw new Error('Called twice');
            }
            rel = this;
            return this;
        });

        const options = {test: true};
        const modelA = TestModel.forge({id: '1'});
        (await modelA.getLazyRelation('other', options)).should.eql(rel);
        fetchStub.calledOnceWithExactly(options).should.be.true();

        // Check if it can reuse it again
        (await modelA.getLazyRelation('other', options)).should.eql(rel);
        fetchStub.calledOnceWithExactly(options).should.be.true();

        // Check if we can force reload
        await should(modelA.getLazyRelation('other', {forceRefresh: true})).rejectedWith(/Called twice/);
        fetchStub.calledTwice.should.be.true();
    });

    it('returns undefined for nonexistent relations', async function () {
        const TestModel = models.Base.Model.extend({
            tableName: 'test_models'
        });
        const modelA = TestModel.forge({id: '1'});
        should.not.exist(await modelA.getLazyRelation('other'));
    });
});
