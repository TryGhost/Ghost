const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers');
const tiersService = require('../../../../../../../core/server/services/tiers');
const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

describe('Unit: endpoints/utils/serializers/output/pages', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        tiersService.api = {
            browse() {
                return {data: null};
            }
        };

        sinon.stub(mappers, 'pages').returns({});
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
