/// <reference types="vitest/globals" />
import {act, renderHook} from '@testing-library/react';
import {type AddressInfo} from 'node:net';
import http from 'node:http';
import {promisify} from 'node:util';
import * as helpers from '../../../src/utils/helpers';
import {useKoenigFileUpload} from '../../../src/hooks/use-koenig-file-upload';

function makeFile(name: string, type = 'image/jpeg'): File {
    return new File(['content'], name, {type});
}

interface UploadResponse {
    body: Record<string, unknown>;
    status?: number;
}

const successfulUploadResponse: UploadResponse = {
    body: {
        images: [{url: 'https://example.com/image.jpg', ref: null}]
    },
    status: 201
};

const serverErrorUploadResponse: UploadResponse = {
    body: {
        errors: [{message: 'File too large', context: 'Max size is 10MB'}]
    },
    status: 413
};

interface RequestLog {
    method?: string;
    url?: string;
}

describe('useKoenigFileUpload', () => {
    let server: http.Server;
    let baseUrl: string;
    let uploadResponse: UploadResponse;
    let requestLog: RequestLog[];

    beforeEach(async () => {
        uploadResponse = successfulUploadResponse;
        requestLog = [];

        server = http.createServer((req, res) => {
            requestLog.push({method: req.method, url: req.url});

            if (req.method === 'OPTIONS') {
                res.writeHead(204, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Credentials': 'true'
                });
                res.end();
                return;
            }

            res.writeHead(uploadResponse.status ?? 200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Credentials': 'true'
            });

            res.end(JSON.stringify(uploadResponse.body));
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

    it('returns initial state', () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        expect(result.current.progress).toBe(0);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.errors).toEqual([]);
        expect(result.current.filesNumber).toBe(0);
        expect(typeof result.current.upload).toBe('function');
    });

    it('validates file extension and returns error for unsupported type', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const badFile = makeFile('document.pdf', 'application/pdf');

        const uploadResult = await act(async () => (
            await result.current.upload([badFile])
        ));

        expect(uploadResult).toBeNull();
        expect(result.current.errors).toHaveLength(1);
        expect(result.current.errors[0].fileName).toBe('document.pdf');
        expect(result.current.errors[0].message).toMatch(/not supported/i);
        expect(result.current.isLoading).toBe(false);
    });

    it('accepts valid image files', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const goodFile = makeFile('photo.jpg', 'image/jpeg');

        const uploadResult = await act(async () => (
            await result.current.upload([goodFile])
        ));

        expect(result.current.errors).toHaveLength(0);
        expect(uploadResult?.[0].url).toBe('https://example.com/image.jpg');
        expect(uploadResult?.[0].fileName).toBe('photo.jpg');
    });

    it('sets isLoading to false after upload completes', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const goodFile = makeFile('photo.jpg');
        await act(async () => {
            await result.current.upload([goodFile]);
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('POSTs to the correct image upload endpoint', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const file = makeFile('photo.jpg');
        await act(async () => {
            await result.current.upload([file]);
        });

        const postRequest = requestLog.find(request => request.method === 'POST');
        expect(postRequest).toBeDefined();
        expect(postRequest?.url).toContain('/ghost/api/admin/images/upload/');
    });

    it('returns null and sets errors when server returns an error status', async () => {
        uploadResponse = serverErrorUploadResponse;

        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const file = makeFile('photo.jpg');
        const uploadResult = await act(async () => (
            await result.current.upload([file])
        ));

        expect(uploadResult).toBeNull();
        expect(result.current.errors).toHaveLength(1);
        expect(result.current.isLoading).toBe(false);
    });

    it('tracks upload progress', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const file = makeFile('photo.jpg');
        await act(async () => {
            await result.current.upload([file]);
        });

        // After successful upload, progress should be 100
        expect(result.current.progress).toBe(100);
    });

    it('records the number of files being uploaded', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const files = [makeFile('a.jpg'), makeFile('b.png')];
        await act(async () => {
            await result.current.upload(files);
        });

        expect(result.current.filesNumber).toBe(2);
    });

    it('clears previous errors on a new successful upload', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const badFile = makeFile('doc.pdf');
        await act(async () => {
            await result.current.upload([badFile]);
        });
        expect(result.current.errors).toHaveLength(1);

        uploadResponse = successfulUploadResponse;
        const goodFile = makeFile('photo.jpg');
        await act(async () => {
            await result.current.upload([goodFile]);
        });
        expect(result.current.errors).toHaveLength(0);
    });

    it('extracts error message from server error response', async () => {
        uploadResponse = serverErrorUploadResponse;

        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const file = makeFile('photo.jpg');
        await act(async () => {
            await result.current.upload([file]);
        });

        expect(result.current.errors).toHaveLength(1);
        expect(result.current.errors[0].fileName).toBe('photo.jpg');
        expect(result.current.errors[0].message).toBe(
            'Request is larger than the maximum file size the server allows'
        );
    });

    it('rejects files with no extension for image type', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('image'));

        const file = makeFile('README', 'application/octet-stream');
        const uploadResult = await act(async () => (
            await result.current.upload([file])
        ));

        expect(uploadResult).toBeNull();
        expect(result.current.errors).toHaveLength(1);
        expect(result.current.errors[0].fileName).toBe('README');
        expect(result.current.errors[0].message).toMatch(/not supported/i);
    });

    it('skips validation for file type and accepts any extension', async () => {
        const {result} = renderHook(() => useKoenigFileUpload('file'));

        const file = makeFile('document.xyz', 'application/octet-stream');
        const uploadResult = await act(async () => (
            await result.current.upload([file])
        ));

        expect(uploadResult).not.toBeNull();
        expect(result.current.errors).toHaveLength(0);
    });

    it('accepts all supported image extensions', async () => {
        const supportedExtensions = ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'];

        for (const ext of supportedExtensions) {
            const {result} = renderHook(() => useKoenigFileUpload('image'));
            const file = makeFile(`image.${ext}`);
            const uploadResult = await act(async () => (
                await result.current.upload([file])
            ));
            // Each valid extension should produce a successful upload result
            expect(uploadResult).not.toBeNull();
        }
    });
});
