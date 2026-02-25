import {renderHook} from '@testing-library/react';
import {type AddressInfo} from 'node:net';
import http from 'node:http';
import {setTimeout as sleep} from 'node:timers/promises';
import {promisify} from 'node:util';
import React, {ReactNode} from 'react';
import {FrameworkProvider} from '../../../../src/providers/framework-provider';
import {useFetchApi} from '../../../../src/utils/api/fetch-api';
import {TimeoutError} from '../../../../src/utils/errors';

const wrapper: React.FC<{ children: ReactNode }> = ({children}) => (
    <FrameworkProvider
        externalNavigate={() => {}}
        ghostVersion='5.x'
        sentryDSN=''
        unsplashConfig={{
            Authorization: '',
            'Accept-Version': '',
            'Content-Type': '',
            'App-Pragma': '',
            'X-Unsplash-Cache': true
        }}
        onDelete={() => {}}
        onInvalidate={() => {}}
        onUpdate={() => {}}
    >
        {children}
    </FrameworkProvider>
);

type TestResponseBody = Pick<http.IncomingMessage, 'method' | 'headers'> & {
    body: string;
};

describe('useFetchApi', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeEach(async () => {
        server = http.createServer((req, res) => {
            const chunks: Buffer[] = [];
            req.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            req.on('end', async () => {
                if (req.url?.includes('slow')) {
                    await sleep(100);
                }
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    method: req.method,
                    headers: req.headers,
                    body: Buffer.concat(chunks).toString('utf8')
                } satisfies TestResponseBody));
            });
        });

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                resolve();
            });
        });

        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        const close = promisify(server.close.bind(server));
        await close();
    });

    it('makes an API request', async () => {
        const {result} = renderHook(() => useFetchApi(), {wrapper});

        const data = await result.current<TestResponseBody>(`${baseUrl}/ghost/api/admin/test/`, {
            method: 'POST',
            body: 'test',
            retry: false
        });

        expect(data.method).toBe('POST');
        expect(data.headers['x-ghost-version']).toBe('5.x');
        expect(data.headers['app-pragma']).toBe('no-cache');
        expect(data.headers['content-type']).toBe('application/json');
        expect(data.body).toBe('test');
    });

    it('throws a timeout error when request exceeds timeout', async () => {
        const {result} = renderHook(() => useFetchApi(), {wrapper});

        await expect(result.current(`${baseUrl}/ghost/api/admin/slow/`, {
            timeout: 20,
            retry: false
        })).rejects.toBeInstanceOf(TimeoutError);
    });
});
