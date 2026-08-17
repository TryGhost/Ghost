import {afterEach, describe, expect, it, vi} from 'vitest';
import {readLabs, settingsEndpoint, writeLab} from './api';

function jsonResponse(body: unknown) {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(body)
    };
}

function settingsResponse(labs: Record<string, boolean>) {
    return jsonResponse({
        settings: [
            {key: 'title', value: 'Test site'},
            {key: 'labs', value: JSON.stringify(labs)}
        ]
    });
}

function stubFetch(response: unknown) {
    const fetchMock = vi.fn(() => Promise.resolve(response));

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
});

describe('settingsEndpoint', () => {
    it.each([
        ['/ghost/settings', '/ghost/api/admin/settings/'],
        ['/blog/ghost/settings', '/blog/ghost/api/admin/settings/']
    ])('resolves %s to %s', (pathname, expected) => {
        window.history.pushState({}, '', pathname);

        expect(settingsEndpoint()).toBe(expected);
    });
});

describe('readLabs', () => {
    it('reads booleans out of the labs setting', async () => {
        stubFetch(settingsResponse({tagsX: true, automations: false}));

        await expect(readLabs()).resolves.toEqual({tagsX: true, automations: false});
    });

    it('throws rather than reporting an absent labs setting as no flags enabled', async () => {
        // The write replaces the whole setting, so an empty-looking map would take
        // every enabled flag with it on the next toggle.
        stubFetch(jsonResponse({settings: [{key: 'title', value: 'Test site'}]}));

        await expect(readLabs()).rejects.toThrow(/no labs value/);
    });

    it('throws on a response with no settings array', async () => {
        stubFetch(jsonResponse({}));

        await expect(readLabs()).rejects.toThrow(/no settings array/);
    });

    it('carries the status code so callers can tell auth from a server error', async () => {
        stubFetch({ok: false, status: 403, statusText: 'Forbidden'});

        await expect(readLabs()).rejects.toMatchObject({status: 403});
    });
});

describe('writeLab', () => {
    it('sends only writable flags, as a JSON string', async () => {
        const fetchMock = stubFetch(settingsResponse({tagsX: true}));

        // A read gives back the effective map: GA flags, the synthetic `members`
        // key and config.local.json pins all ride along and must not be written.
        await writeLab({
            tagsX: false,
            superEditors: true,
            explore: true,
            members: true,
            devLabsPanel: true
        }, 'tagsX', true);

        const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        const payload = JSON.parse(init.body as string) as {settings: {key: string; value: string}[]};

        expect(payload.settings[0].key).toBe('labs');
        expect(typeof payload.settings[0].value).toBe('string');
        expect(JSON.parse(payload.settings[0].value)).toEqual({tagsX: true, superEditors: true});
    });

    it('returns the server map and the raw settings list', async () => {
        stubFetch(settingsResponse({tagsX: true}));

        const result = await writeLab({}, 'tagsX', true);

        expect(result.labs).toEqual({tagsX: true});
        expect(result.settings.find(setting => setting.key === 'title')).toBeTruthy();
    });
});
