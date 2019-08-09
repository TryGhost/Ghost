const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mapper = require('../../../../../../../server/api/canary/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/output/posts', () => {
    let postModel;

    beforeEach(() => {
        postModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(mapper, 'mapPost').returns({});
    });

    afterEach(() => {
        sinon.restore();
    });

    it('calls the mapper', () => {
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

        serializers.output.pages.all(ctrlResponse, apiConfig, frame);

        mapper.mapPost.callCount.should.equal(2);
        mapper.mapPost.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
    });
});
