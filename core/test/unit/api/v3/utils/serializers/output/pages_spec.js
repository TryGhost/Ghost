const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mapper = require('../../../../../../../server/api/canary/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../server/api/canary/utils/serializers');

describe('Unit: v3/utils/serializers/output/pages', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(mapper, 'mapPage').returns({});
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
                pageModel(testUtils.DataGenerator.forKnex.createPost({
                    id: 'id1',
                    type: 'page'
                })),
                pageModel(testUtils.DataGenerator.forKnex.createPost({
                    id: 'id2',
                    type: 'page'
                }))
            ],
            meta: {}
        };

        serializers.output.pages.all(ctrlResponse, apiConfig, frame);

        mapper.mapPage.callCount.should.equal(2);
        mapper.mapPage.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
    });
});
