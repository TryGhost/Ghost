const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');
const membersService = require('../../../../../../../core/server/services/members');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/output/pages', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
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

        sinon.stub(mappers, 'pages').returns({});
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
                pageModel(testUtils.DataGenerator.forKnex.createPost({
                    id: 'id1',
                    page: true
                })),
                pageModel(testUtils.DataGenerator.forKnex.createPost({
                    id: 'id2',
                    page: true
                }))
            ],
            meta: {}
        };

        await serializers.output.pages.all(ctrlResponse, apiConfig, frame);

        mappers.pages.callCount.should.equal(2);
        mappers.pages.getCall(0).args.should.eql([ctrlResponse.data[0], frame, {tiers: []}]);
    });
});
