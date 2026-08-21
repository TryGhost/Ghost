import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';

import {describe, expect, it, vi} from 'vitest';

import {createCodexRequestHandler} from '../vite-backend-proxy';

import type {IncomingMessage, ServerResponse} from 'node:http';

class ResponseStub extends EventEmitter {
    statusCode = 200;
    destroyed = false;
    writableEnded = false;
    readonly end = vi.fn(() => {
        this.writableEnded = true;
    });
    readonly setHeader = vi.fn();
    readonly write = vi.fn(() => true);
}

describe('Codex development proxy', () => {
    it('aborts the upstream request when the Builder client disconnects', async () => {
        let upstreamSignal: AbortSignal | undefined;
        const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
            upstreamSignal = init?.signal ?? undefined;
            upstreamSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
        }));
        const requestStream = Object.assign(new PassThrough(), {
            method: 'POST',
            url: '/codex/responses',
            headers: {authorization: 'Bearer local-session-token'}
        });
        const request = requestStream as unknown as IncomingMessage;
        const response = new ResponseStub() as unknown as ServerResponse;
        const handleRequest = createCodexRequestHandler(fetch);

        requestStream.end('{}');
        const handling = handleRequest(request, response);
        await vi.waitFor(() => expect(upstreamSignal).toBeDefined());

        (response as unknown as ResponseStub).destroyed = true;
        (response as unknown as ResponseStub).emit('close');
        await handling;

        expect(upstreamSignal?.aborted).toBe(true);
        expect((response as unknown as ResponseStub).end).not.toHaveBeenCalled();
    });
});
