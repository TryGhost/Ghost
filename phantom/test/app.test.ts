import {describe, expect, it} from 'vitest';
import {createApp} from '../src/app/app.js';

const siteService = {
    getSite: async () => ({
        id: 'site',
        title: 'Ghost',
        description: null,
        locale: 'en',
        createdAt: 1,
        updatedAt: 1
    }),
    updateSite: async (input: {title?: string; description?: string | null; locale?: string}) => ({
        id: 'site',
        title: input.title ?? 'Ghost',
        description: input.description ?? null,
        locale: input.locale ?? 'en',
        createdAt: 1,
        updatedAt: 2
    })
};

describe('app routes', () => {
    it('returns health status', async () => {
        const app = createApp({siteService});

        const response = await app.request('/health');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({status: 'ok'});
    });

    it('updates site details', async () => {
        const app = createApp({siteService});

        const response = await app.request('/site', {
            method: 'PUT',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                title: 'Ghost Daily',
                locale: 'en-us'
            })
        });

        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.site.title).toBe('Ghost Daily');
        expect(body.site.locale).toBe('en-us');
    });

    it('returns validation errors for invalid updates', async () => {
        const app = createApp({siteService});

        const response = await app.request('/site', {
            method: 'PUT',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                title: ''
            })
        });

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('validation_error');
    });
});
