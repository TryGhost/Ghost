const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers');
const tiersService = require('../../../../../../../core/server/services/tiers');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/output/posts', function () {
    let postModel;

    beforeEach(function () {
        postModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        tiersService.api = {
            browse() {
                return {data: null};
            }
        };

        sinon.stub(mappers, 'posts').returns({});
    });

    afterEach(function () {
        sinon.restore();
        tiersService.api = null;
    });

    it('calls the mapper', async function () {
        const apiConfig = {};
        const frame = {
            options: {
                withRelated: ['tags', 'authors'],
                context: {
                    private: false
                }
            }
        };

        const ctrlResponse = {
            data: [
                postModel(testUtils.DataGenerator.forKnex.createPost({})),
                postModel(testUtils.DataGenerator.forKnex.createPost({}))
            ],
            meta: {}
        };

        await serializers.output.posts.all(ctrlResponse, apiConfig, frame);

        mappers.posts.callCount.should.equal(2);
        mappers.posts.getCall(0).args.should.eql([ctrlResponse.data[0], frame, {tiers: []}]);
    });
});
