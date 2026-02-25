const sinon = require('sinon');
const models = require('../../../../../core/server/models');
const assert = require('node:assert/strict');

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
        assert.equal((await modelA.getLazyRelation('tiers', options)), rel);
        sinon.assert.calledOnceWithExactly(fetchStub, options);

        // Check if it can reuse it again
        assert.equal((await modelA.getLazyRelation('tiers', options)), rel);
        sinon.assert.calledOnceWithExactly(fetchStub, options);

        // Check if we can force reload
        await assert.rejects(modelA.getLazyRelation('tiers', {forceRefresh: true}), /Called twice/);
        sinon.assert.calledTwice(fetchStub);
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
            rel.id = 'test123'; // we need to set an id
            return this;
        });

        const options = {test: true};
        const modelA = TestModel.forge({id: '1'});
        assert.equal((await modelA.getLazyRelation('other', options)), rel);
        sinon.assert.calledOnceWithExactly(fetchStub, options);

        // Check if it can reuse it again
        assert.equal((await modelA.getLazyRelation('other', options)), rel);
        sinon.assert.calledOnceWithExactly(fetchStub, options);

        // Check if we can force reload
        await assert.rejects(modelA.getLazyRelation('other', {forceRefresh: true}), /Called twice/);
        sinon.assert.calledTwice(fetchStub);
    });

    it('can handle fetch of model without id for optional relations', async function () {
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
        sinon.stub(OtherModel.prototype, 'fetch').callsFake(function () {
            if (rel !== null) {
                throw new Error('Called twice');
            }
            rel = this;
            return this;
        });

        const modelA = TestModel.forge({id: '1'});
        assert.equal(await modelA.getLazyRelation('other'), undefined);
    });

    it('throws for model without id for optional relations with require', async function () {
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
        sinon.stub(OtherModel.prototype, 'fetch').callsFake(function () {
            if (rel !== null) {
                throw new Error('Called twice');
            }
            rel = this;
            return this;
        });

        const modelA = TestModel.forge({id: '1'});
        await assert.rejects(modelA.getLazyRelation('other', {require: true}));
    });

    it('returns undefined for nonexistent relations', async function () {
        const TestModel = models.Base.Model.extend({
            tableName: 'test_models'
        });
        const modelA = TestModel.forge({id: '1'});
        assert.equal(await modelA.getLazyRelation('other'), undefined);
    });

    it('throws for nonexistent relations with require', async function () {
        const TestModel = models.Base.Model.extend({
            tableName: 'test_models'
        });
        const modelA = TestModel.forge({id: '1'});
        await assert.rejects(modelA.getLazyRelation('other', {require: true}));
    });
});
