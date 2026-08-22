import {describe, expect, it} from 'vitest';
import {deserializeResponse} from '../../src/sandbox/serialized-response.ts';

describe('deserializeResponse', function () {
    it('reconstructs null-body HTTP responses without throwing', async function () {
        const response = deserializeResponse({status: 204, statusText: 'No Content', headers: {}, body: ''});

        expect(response.status).toBe(204);
        await expect(response.text()).resolves.toBe('');
    });
});
