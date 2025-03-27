const assert = require('assert/strict');
const extractApiKey = require('../../../../../core/server/services/api-version-compatibility/extract-api-key');

describe('Extract API Key', function () {
    it('Returns nulls for a request without any key', function () {
        const {key, type} = extractApiKey({
            query: {
                filter: 'status:active'
            }
        });

        assert.equal(key, null);
        assert.equal(type, null);
    });

    it('Extracts Content API key from the request', function () {
        const {key, type} = extractApiKey({
            query: {
                key: '123thekey'
            }
        });

        assert.equal(key, '123thekey');
        assert.equal(type, 'content');
    });

    it('Extracts Admin API key from the request', function () {
        const {key, type} = extractApiKey({
            headers: {
                authorization: 'Ghost eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjYyNzM4MjQzNDZiZjUxZjNhYWI5OTA5OSJ9.eyJpYXQiOjE2NTIxNjUyNDQsImV4cCI6MTY1MjE2NTU0NCwiYXVkIjoiL3YyL2FkbWluLyJ9.VdPOZ4XffgYd8qn_46zlJR3jW_rPZTw70COkG5IYIuU'
            }
        });

        assert.equal(key, '6273824346bf51f3aab99099');
        assert.equal(type, 'admin');
    });

    it('Returns null if malformatted Admin API Key', function () {
        const {key, type} = extractApiKey({
            headers: {
                authorization: 'Ghost incorrectformat'
            }
        });

        assert.equal(key, null);
        assert.equal(type, 'admin');
    });
});
