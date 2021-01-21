const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mapper = require('../../../../../../../core/server/api/v3/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../core/server/api/v3/utils/serializers');

describe('Unit: v3/utils/serializers/output/posts', function () {
    let postModel;

    beforeEach(function () {
        postModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(mapper, 'mapPost').returns({});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('calls the mapper', function () {
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

        serializers.output.posts.all(ctrlResponse, apiConfig, frame);

        mapper.mapPost.callCount.should.equal(2);
        mapper.mapPost.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
    });
});
