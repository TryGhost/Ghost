const should = require('should');
const sinon = require('sinon');

// Use path relative to test file
const {
    getSessionId,
    setSessionId,
    getStorageObject
} = require('../../../../core/frontend/src/utils/session-storage');

describe('Session Storage Utils', function () {
    let mockStorage;
    
    beforeEach(function () {
        // Create mock storage
        mockStorage = {
            getItem: sinon.stub(),
            setItem: sinon.stub(),
            removeItem: sinon.stub()
        };
    });
    
    afterEach(function () {
        sinon.restore();
    });
    
    describe('getSessionId', function () {
        it('should return null when no item exists', function () {
            mockStorage.getItem.withArgs('test-key').returns(null);
            
            const result = getSessionId('test-key', mockStorage);
            should.equal(result, null);
            sinon.assert.calledOnce(mockStorage.getItem);
        });
        
        it('should return null when item is not valid JSON', function () {
            mockStorage.getItem.withArgs('test-key').returns('not-json');
            
            const result = getSessionId('test-key', mockStorage);
            should.equal(result, null);
        });
        
        it('should return null when item is not an object', function () {
            mockStorage.getItem.withArgs('test-key').returns('"string"');
            
            const result = getSessionId('test-key', mockStorage);
            should.equal(result, null);
        });
        
        it('should return null when item is expired', function () {
            const expiredItem = {
                value: 'test-id',
                expiry: Date.now() - 10000 // 10 seconds in the past
            };
            mockStorage.getItem.withArgs('test-key').returns(JSON.stringify(expiredItem));
            
            const result = getSessionId('test-key', mockStorage);
            should.equal(result, null);
            sinon.assert.calledOnce(mockStorage.removeItem);
        });
        
        it('should return the session ID when item is valid and not expired', function () {
            const validItem = {
                value: 'test-id',
                expiry: Date.now() + 3600000 // 1 hour in the future
            };
            mockStorage.getItem.withArgs('test-key').returns(JSON.stringify(validItem));
            
            const result = getSessionId('test-key', mockStorage);
            should.equal(result, 'test-id');
        });
    });
    
    describe('setSessionId', function () {
        it('should use existing session ID if valid', function () {
            const validItem = {
                value: 'existing-id',
                expiry: Date.now() + 3600000 // 1 hour in the future
            };
            mockStorage.getItem.withArgs('test-key').returns(JSON.stringify(validItem));
            
            const result = setSessionId('test-key', mockStorage);
            should.equal(result, 'existing-id');
            
            // Should still update the expiry time
            sinon.assert.calledOnce(mockStorage.setItem);
            const setCall = mockStorage.setItem.getCall(0);
            const setData = JSON.parse(setCall.args[1]);
            should.equal(setData.value, 'existing-id');
            should.ok(setData.expiry > validItem.expiry); // Expiry time should be extended
        });
        
        it('should create new session ID if none exists', function () {
            mockStorage.getItem.withArgs('test-key').returns(null);
            
            const result = setSessionId('test-key', mockStorage);
            
            // We can't easily stub uuid.v4, so just verify it's a valid UUID format
            should.exist(result);
            result.should.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            
            sinon.assert.calledOnce(mockStorage.setItem);
            const setCall = mockStorage.setItem.getCall(0);
            const setData = JSON.parse(setCall.args[1]);
            should.equal(setData.value, result);
        });
        
        it('should use custom TTL value', function () {
            mockStorage.getItem.withArgs('test-key').returns(null);
            
            // Set with 2 hour TTL
            const customTtlHours = 2;
            const now = new Date();
            setSessionId('test-key', mockStorage, customTtlHours);
            
            sinon.assert.calledOnce(mockStorage.setItem);
            const setCall = mockStorage.setItem.getCall(0);
            const setData = JSON.parse(setCall.args[1]);
            
            // Check that expiry is approximately 2 hours in the future
            const expectedExpiry = now.getTime() + (customTtlHours * 3600 * 1000);
            const expiryDiff = Math.abs(setData.expiry - expectedExpiry);
            should.ok(expiryDiff < 1000); // Should be within 1 second (to account for test execution time)
        });
    });
    
    describe('getStorageObject', function () {
        let originalLocalStorage;
        let originalSessionStorage;
        
        beforeEach(function () {
            // Save original storage objects if they exist
            originalLocalStorage = global.localStorage;
            originalSessionStorage = global.sessionStorage;
            
            // Create minimal mock storage objects that satisfy the Storage interface
            const createStorageMock = function (name) {
                return {
                    length: 0,
                    clear: sinon.stub(),
                    getItem: sinon.stub(),
                    key: sinon.stub(),
                    removeItem: sinon.stub(),
                    setItem: sinon.stub(),
                    name: name
                };
            };
            
            // Set up mock storage objects
            global.localStorage = createStorageMock('localStorage');
            global.sessionStorage = createStorageMock('sessionStorage');
        });
        
        afterEach(function () {
            // Restore original storage objects
            global.localStorage = originalLocalStorage;
            global.sessionStorage = originalSessionStorage;
        });
        
        it('should return localStorage when method is localStorage', function () {
            const result = getStorageObject('localStorage');
            should.equal(result, global.localStorage);
            should.equal(result.name, 'localStorage');
        });
        
        it('should return sessionStorage when method is not localStorage', function () {
            const result = getStorageObject('sessionStorage');
            should.equal(result, global.sessionStorage);
            should.equal(result.name, 'sessionStorage');
            
            const result2 = getStorageObject('anything-else');
            should.equal(result2, global.sessionStorage);
            should.equal(result2.name, 'sessionStorage');
        });
    });
}); 