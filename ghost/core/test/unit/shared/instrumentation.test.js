const assert = require('assert/strict');
const sinon = require('sinon');

describe('UNIT: instrumentation', function () {
    it('should initialize OpenTelemetry if configured', async function () {
        const config = {
            get: sinon.stub().returns(true)
        };
        const instrumentation = require('../../../core/shared/instrumentation');
        const result = await instrumentation.initOpenTelemetry({config});
        assert.equal(result, true);
    });

    it('should not initialize OpenTelemetry if not configured', async function () {
        const config = {
            get: sinon.stub().returns(false)
        };
        const instrumentation = require('../../../core/shared/instrumentation');
        
        const result = await instrumentation.initOpenTelemetry({config});
        assert.equal(result, false);
    });
});