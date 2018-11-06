const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const urlService = require('../../../../../../../server/services/url');
const mapper = require('../../../../../../../server/api/v2/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

const sandbox = sinon.sandbox.create();

describe('Unit: v2/utils/serializers/output/pages', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sandbox.stub().returns(data)});
        };

        sandbox.stub(mapper, 'mapPost').returns({});
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Ensure mapper is being called for each model', function () {
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
                        feature_image: 'value',
                    })),
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        id: 'id2',
                        page: true,
                        html: '<img href=/content/test.jpf'
                    }))
                ],
                meta: {}
            };

            serializers.output.pages.all(ctrlResponse, apiConfig, frame);

            mapper.mapPost.callCount.should.equal(2);
            mapper.mapPost.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
        });
    });
});
