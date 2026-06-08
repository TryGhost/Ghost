/// <reference types="vitest/globals" />
import {renderHook} from '@testing-library/react';
import {type AddressInfo} from 'node:net';
import http from 'node:http';
import {promisify} from 'node:util';
import * as helpers from '../../../src/utils/helpers';
import {useKoenigFetchEmbed} from '../../../src/hooks/use-koenig-fetch-embed';

interface OEmbedResponse {
    type: string;
    html: string;
}

interface RequestLog {
    method?: string;
    url?: string;
    headers?: http.IncomingHttpHeaders;
}

describe('useKoenigFetchEmbed', () => {
    let server: http.Server;
    let baseUrl: string;
    let requestLog: RequestLog[];
    let responseStatus: number;
    let responseBody: OEmbedResponse | {errors: Array<{message: string}>};

    beforeEach(async () => {
        requestLog = [];
        responseStatus = 200;
        responseBody = {
            type: 'video',
            html: '<iframe src="https://example.com/embed"></iframe>'
        };

        server = http.createServer((req, res) => {
            requestLog.push({method: req.method, url: req.url, headers: req.headers});
            res.writeHead(responseStatus, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(responseBody));
        });

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                resolve();
            });
        });

        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;

        vi.spyOn(helpers, 'getGhostPaths').mockReturnValue({
            subdir: '',
            adminRoot: '/ghost/',
            assetRoot: '/ghost/assets/',
            apiRoot: `${baseUrl}/ghost/api/admin`,
            activityPubRoot: '/.ghost/activitypub'
        });
    });

    afterEach(async () => {
        const close = promisify(server.close.bind(server));
        await close();
        vi.restoreAllMocks();
    });

    it('requests oembed with url parameter', async () => {
        const {result} = renderHook(() => useKoenigFetchEmbed());

        const embedResult = await result.current('https://ghost.org/');
        expect(embedResult).toEqual(responseBody);

        const request = requestLog[0];
        expect(request?.method).toBe('GET');
        expect(request?.headers?.['app-pragma']).toBe('no-cache');

        const requestUrl = new URL(request?.url || '', baseUrl);
        expect(requestUrl.pathname).toBe('/ghost/api/admin/oembed/');
        expect(requestUrl.searchParams.get('url')).toBe('https://ghost.org/');
        expect(requestUrl.searchParams.get('type')).toBeNull();
    });

    it('includes type parameter when provided', async () => {
        const {result} = renderHook(() => useKoenigFetchEmbed());

        await result.current('https://ghost.org/', {type: 'bookmark'});

        const requestUrl = new URL(requestLog[0]?.url || '', baseUrl);
        expect(requestUrl.searchParams.get('url')).toBe('https://ghost.org/');
        expect(requestUrl.searchParams.get('type')).toBe('bookmark');
    });

    it('throws when the oembed request fails', async () => {
        responseStatus = 500;
        responseBody = {
            errors: [{message: 'Server failure'}]
        };

        const {result} = renderHook(() => useKoenigFetchEmbed());
        await expect(result.current('https://ghost.org/')).rejects.toThrow(/oembed/i);
    });
});
