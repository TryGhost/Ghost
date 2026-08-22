import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createEditorFetchCapability} from '../../src/host/host-fetch.ts';
import type {AddonInstallRecord} from '../../src/types.ts';

const install: AddonInstallRecord = {
    manifestUrl: 'https://addons.example/manifest.json',
    handle: 'podcast-demo',
    name: 'Podcast demo',
    enabled: true,
    version: '1.0.0',
    apiVersion: '2026-01',
    backend: 'https://podcasts.example',
    targeting: []
};

describe('createEditorFetchCapability', function () {
    beforeEach(function () {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}', {
            headers: {'content-type': 'application/json'},
            status: 200
        })));
    });

    it('limits settings requests to the declared backend without ambient credentials', async function () {
        const capability = createEditorFetchCapability(install);

        await capability.fetch({
            url: 'https://podcasts.example/api/resolve',
            method: 'POST',
            headers: {authorization: 'provider supplied', 'content-type': 'application/json'},
            body: '{"url":"https://episodes.example/one"}'
        });

        expect(fetch).toHaveBeenCalledWith(new URL('https://podcasts.example/api/resolve'), expect.objectContaining({
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                'content-type': 'application/json',
                'x-ghost-dev-identity': expect.stringContaining('"user":null')
            }
        }));
    });

    it('rejects requests to undeclared origins', async function () {
        const capability = createEditorFetchCapability(install);

        await expect(capability.fetch({url: 'https://tracking.example/collect'})).rejects.toThrow('declared backend origin');
        expect(fetch).not.toHaveBeenCalled();
    });
});
