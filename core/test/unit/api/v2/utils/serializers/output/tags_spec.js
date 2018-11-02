const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const dateUtil = require('../../../../../../../server/api/v2/utils/serializers/output/utils/date');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

const sandbox = sinon.sandbox.create();

describe('Unit: v2/utils/serializers/output/tags', function () {
    let tagModel;

    beforeEach(function () {
        tagModel = (data) => {
            return Object.assign(data, {toJSON: sandbox.stub().returns(data)});
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Ensure date fields are being processed with date formatter', function () {
        let dateStub;

        beforeEach(() => {
            dateStub = sandbox.stub(dateUtil, 'format');
        });

        it('date formatter is being called for single item in public context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };

            const ctrlResponse = tagModel(testUtils.DataGenerator.forKnex.createTag());

            serializers.output.tags.all(ctrlResponse, apiConfig, frame);

            dateStub.callCount.should.equal(2);
        });

        it('date formatter is being called in public context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };

            const ctrlResponse = {
                data: [
                    tagModel(testUtils.DataGenerator.forKnex.createTag()),
                    tagModel(testUtils.DataGenerator.forKnex.createTag())
                ],
                meta: {}
            };

            serializers.output.tags.all(ctrlResponse, apiConfig, frame);

            dateStub.callCount.should.equal(4);
        });

        it('date formatter is being called in private context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: false
                    }
                }
            };

            const ctrlResponse = {
                data: [
                    tagModel(testUtils.DataGenerator.forKnex.createTag())
                ],
                meta: {}
            };

            serializers.output.tags.all(ctrlResponse, apiConfig, frame);

            dateStub.called.should.be.false;
        });
    });
});
