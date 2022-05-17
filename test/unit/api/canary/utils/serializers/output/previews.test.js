const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');
const membersService = require('../../../../../../../core/server/services/members');

describe('Unit: canary/utils/serializers/output/previews', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data), get: key => (key === 'type' ? 'page' : '')});
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

        const ctrlResponse = pageModel(testUtils.DataGenerator.forKnex.createPost({
            id: 'id1',
            type: 'page'
        }));

        await serializers.output.previews.all(ctrlResponse, apiConfig, frame);

        mappers.posts.callCount.should.equal(1);
        mappers.posts.getCall(0).args.should.eql([ctrlResponse, frame, {tiers: []}]);

        frame.response.previews[0].type.should.equal('page');
    });
});
