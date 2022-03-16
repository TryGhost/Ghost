const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');
const membersService = require('../../../../../../../core/server/services/members');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/output/posts', function () {
    let postModel;

    beforeEach(function () {
        postModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(membersService, 'api').get(() => {
            return {
                productRepository: {
                    list: () => {
                        return {data: null};
                    }
                }
            };
        });

        sinon.stub(mappers, 'posts').returns({});
    });

    afterEach(function () {
        sinon.restore();
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
