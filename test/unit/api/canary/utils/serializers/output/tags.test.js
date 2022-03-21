const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');

describe('Unit: canary/utils/serializers/output/tags', function () {
    let tagModel;

    beforeEach(function () {
        tagModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(mappers, 'tags').returns({});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('calls the mapper when single tag present', function () {
        const apiConfig = {docName: 'tags'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = tagModel(testUtils.DataGenerator.forKnex.createTag());

        serializers.output.default.all(ctrlResponse, apiConfig, frame);

        mappers.tags.callCount.should.equal(1);
        mappers.tags.getCall(0).args.should.eql([ctrlResponse, frame]);
    });

    it('calls the mapper with multiple tags', function () {
        const apiConfig = {docName: 'tags'};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = tagModel({
            data: [
                testUtils.DataGenerator.forKnex.createTag(),
                testUtils.DataGenerator.forKnex.createTag()
            ],
            meta: {}
        });

        serializers.output.default.all(ctrlResponse, apiConfig, frame);

        mappers.tags.callCount.should.equal(2);
        mappers.tags.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
    });
});
