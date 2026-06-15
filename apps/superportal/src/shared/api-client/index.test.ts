import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {createApiClientFromSite} from './index';

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', {status: 200, headers: {'Content-Type': 'application/json'}}));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function requestedUrl(): string {
    return String(fetchMock.mock.calls[0]?.[0]);
}

describe('createApiClientFromSite', () => {
    it('derives the content API url and key from the site', async () => {
        const api = createApiClientFromSite({url: 'https://site.example/', search_api_key: 'k1'});

        await api.site.tiers();

        expect(requestedUrl()).toMatch(/^https:\/\/site\.example\/ghost\/api\/content\/tiers\/\?/);
        expect(requestedUrl()).toContain('key=k1');
    });

    it('prefers content_api_url when provided', async () => {
        const api = createApiClientFromSite({
            url: 'https://site.example/',
            content_api_url: 'https://cdn.example/ghost/api/content',
            search_api_key: 'k1'
        });

        await api.site.newsletters();

        expect(requestedUrl()).toMatch(/^https:\/\/cdn\.example\/ghost\/api\/content\/newsletters\/\?/);
    });

    it('keeps members endpoints on the site origin', async () => {
        const api = createApiClientFromSite({url: 'https://site.example/', search_api_key: 'k1'});

        await api.site.read();

        expect(requestedUrl()).toBe('https://site.example/members/api/site/');
    });
});

describe('member.newsletters (keyed)', () => {
    it('returns the top-level member fields from GET', async () => {
        const body = {
            uuid: 'u1',
            email: 'a@b.c',
            name: 'A',
            newsletters: [{id: 'n1', uuid: 'nu1', name: 'Weekly', description: null, sort_order: 0}],
            enable_comment_notifications: true,
            status: 'paid'
        };
        fetchMock.mockResolvedValue(new Response(JSON.stringify(body), {status: 200, headers: {'Content-Type': 'application/json'}}));
        const api = createApiClientFromSite({url: 'https://site.example/', search_api_key: 'k1'});

        const res = await api.member.newsletters({uuid: 'u1', key: 'k'});

        expect(requestedUrl()).toBe('https://site.example/members/api/member/newsletters/?uuid=u1&key=k');
        expect(res?.email).toBe('a@b.c');
        expect(res?.status).toBe('paid');
        expect(res?.newsletters?.[0]?.id).toBe('n1');
    });

    it('PUTs newsletters and comment notifications at the top level', async () => {
        const api = createApiClientFromSite({url: 'https://site.example/', search_api_key: 'k1'});

        await api.member.updateNewsletters({uuid: 'u1', key: 'k', newsletters: [{id: 'n1'}], enable_comment_notifications: false});

        const [, init] = fetchMock.mock.calls[0] ?? [];
        expect((init as RequestInit).method).toBe('PUT');
        expect(JSON.parse(String((init as RequestInit).body))).toEqual({
            newsletters: [{id: 'n1'}],
            enable_comment_notifications: false
        });
    });
});
