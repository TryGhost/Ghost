const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('ApiKey output serializer', function () {
    it('exports an add method', function () {
        should.equal(typeof serializers.output.api_keys.add, 'function');
    });

    describe('#add(models, apiConfig, frame)', function () {
        it('sets frame.response to an object w/ api_keys array of the model JSON', function () {
            const frame = {
                options: {}
            };
            const fakeModel = {
                toJSON(options) {
                    should.equal(options, frame.options);
                    return 'JSON YEAAAAH';
                }
            };

            serializers.output.api_keys.add(fakeModel, null, frame);

            should.deepEqual(frame.response, {
                api_keys: ['JSON YEAAAAH']
            });
        });
    });
});
