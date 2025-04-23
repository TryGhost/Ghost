const should = require('should');

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
            
            should.equal(parsed.user, '********');
            should.equal(parsed.user_id, '********');
            should.equal(parsed.email, '********');
            should.equal(parsed.normal, 'data');
        });
        
        it('should mask custom sensitive attributes', function () {
            const payload = {
                custom_field: 'sensitive',
                normal: 'data'
            };
            
            const customAttributes = ['custom_field'];
            const result = maskSensitiveData(payload, customAttributes);
            const parsed = JSON.parse(result);
            
            should.equal(parsed.custom_field, '********');
            should.equal(parsed.normal, 'data');
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
            
            should.equal(parsed.data.user, '********');
            should.equal(parsed.data.details.email, '********');
            should.equal(parsed.normal, 'data');
        });
        
        it('should handle empty payloads', function () {
            const payload = {};
            
            const result = maskSensitiveData(payload);
            const parsed = JSON.parse(result);
            
            should.deepEqual(parsed, {});
        });
    });

    describe('processPayload', function () {
        it('should return stringified payload with masked data by default', function () {
            const payload = {
                email: 'john@example.com',
                normal: 'data'
            };
            
            const result = processPayload(payload);
            
            should.equal(typeof result, 'string');
            const parsed = JSON.parse(result);
            should.equal(parsed.email, '********');
            should.equal(parsed.normal, 'data');
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
            
            should.equal(parsed.data, 'value');
            should.equal(parsed.global, 'attribute');
        });
        
        it('should return object when stringify is false', function () {
            const payload = {
                email: 'john@example.com',
                normal: 'data'
            };
            
            const result = processPayload(payload, {}, false);
            
            should.equal(typeof result, 'object');
            should.equal(result.email, '********');
            should.equal(result.normal, 'data');
        });
        
        it('should mask sensitive data in global attributes', function () {
            const payload = {
                normal: 'data'
            };
            
            const globalAttributes = {
                email: 'john@example.com'
            };
            
            const result = processPayload(payload, globalAttributes, false);
            
            should.equal(result.email, '********');
            should.equal(result.normal, 'data');
        });
        
        it('should handle empty payload and attributes', function () {
            const payload = {};
            const globalAttributes = {};
            
            const result = processPayload(payload, globalAttributes);
            const parsed = JSON.parse(result);
            
            should.deepEqual(parsed, {});
        });
    });
}); 