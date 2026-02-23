const assert = require('node:assert/strict');

// Use path relative to test file
const {
    processPayload,
    maskSensitiveData
} = require('../../../../core/frontend/src/utils/privacy');

describe('Privacy Utils', function () {
    describe('maskSensitiveData', function () {
        it('should mask default sensitive attributes', function () {
            const payload = {
                user: 'john',
                user_id: 123,
                email: 'john@example.com',
                normal: 'data'
            };
            
            const result = maskSensitiveData(payload);
            const parsed = JSON.parse(result);
            
            assert.equal(parsed.user, '********');
            assert.equal(parsed.user_id, '********');
            assert.equal(parsed.email, '********');
            assert.equal(parsed.normal, 'data');
        });
        
        it('should mask custom sensitive attributes', function () {
            const payload = {
                custom_field: 'sensitive',
                normal: 'data'
            };
            
            const customAttributes = ['custom_field'];
            const result = maskSensitiveData(payload, customAttributes);
            const parsed = JSON.parse(result);
            
            assert.equal(parsed.custom_field, '********');
            assert.equal(parsed.normal, 'data');
        });
        
        it('should handle nested objects', function () {
            const payload = {
                data: {
                    user: 'john',
                    details: {
                        email: 'john@example.com'
                    }
                },
                normal: 'data'
            };
            
            const result = maskSensitiveData(payload);
            const parsed = JSON.parse(result);
            
            assert.equal(parsed.data.user, '********');
            assert.equal(parsed.data.details.email, '********');
            assert.equal(parsed.normal, 'data');
        });
        
        it('should handle empty payloads', function () {
            const payload = {};
            
            const result = maskSensitiveData(payload);
            const parsed = JSON.parse(result);
            
            assert.deepEqual(parsed, {});
        });
    });

    describe('processPayload', function () {
        it('should return stringified payload with masked data by default', function () {
            const payload = {
                email: 'john@example.com',
                normal: 'data'
            };
            
            const result = processPayload(payload);
            
            assert.equal(typeof result, 'string');
            const parsed = JSON.parse(result);
            assert.equal(parsed.email, '********');
            assert.equal(parsed.normal, 'data');
        });
        
        it('should add global attributes to payload', function () {
            const payload = {
                data: 'value'
            };
            
            const globalAttributes = {
                global: 'attribute'
            };
            
            const result = processPayload(payload, globalAttributes);
            const parsed = JSON.parse(result);
            
            assert.equal(parsed.data, 'value');
            assert.equal(parsed.global, 'attribute');
        });
        
        it('should return object when stringify is false', function () {
            const payload = {
                email: 'john@example.com',
                normal: 'data'
            };
            
            const result = processPayload(payload, {}, false);
            
            assert.equal(typeof result, 'object');
            assert.equal(result.email, '********');
            assert.equal(result.normal, 'data');
        });
        
        it('should mask sensitive data in global attributes', function () {
            const payload = {
                normal: 'data'
            };
            
            const globalAttributes = {
                email: 'john@example.com'
            };
            
            const result = processPayload(payload, globalAttributes, false);
            
            assert.equal(result.email, '********');
            assert.equal(result.normal, 'data');
        });
        
        it('should handle empty payload and attributes', function () {
            const payload = {};
            const globalAttributes = {};
            
            const result = processPayload(payload, globalAttributes);
            const parsed = JSON.parse(result);
            
            assert.deepEqual(parsed, {});
        });
    });
}); 