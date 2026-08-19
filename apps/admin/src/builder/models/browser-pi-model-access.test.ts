import {describe, expect, it, vi} from 'vitest';

import type {FetchFunction} from '@earendil-works/pi-ai';

import {BrowserPiModelAccess} from './browser-pi-model-access';

describe('BrowserPiModelAccess', () => {
    it('validates providers and models before creating a runtime', () => {
        const access = new BrowserPiModelAccess({getApiKey: () => 'session-key'});

        expect(() => access.createRuntime({provider: 'openai', modelId: 'claude-sonnet-5'})).toThrow('Unsupported OpenAI model: claude-sonnet-5');
        expect(() => access.createRuntime({provider: 'other' as 'openai', modelId: 'gpt-5.6-sol'})).toThrow('Unsupported provider: other');
    });

    it('requires a session credential for the selected provider', () => {
        const access = new BrowserPiModelAccess({getApiKey: () => undefined});

        expect(() => access.createRuntime({provider: 'anthropic', modelId: 'claude-sonnet-5'})).toThrow('Add an Anthropic API key before starting a turn.');
    });

    it('stops authorizing requests when a key is forgotten after runtime creation', async () => {
        let apiKey: string | undefined = 'session-key';
        const fetch = vi.fn(() => Promise.resolve(new Response(''))) as FetchFunction;
        const errors: string[] = [];
        const access = new BrowserPiModelAccess({getApiKey: () => apiKey, fetch});
        const runtime = access.createRuntime({
            provider: 'openai',
            modelId: 'gpt-5.6-sol',
            onEvent: (event) => {
                if (event.type === 'run-error') {
                    errors.push(event.message);
                }
            }
        });

        apiKey = undefined;
        await runtime.prompt('This must not reach the provider');

        expect(fetch).not.toHaveBeenCalled();
        expect(errors).toEqual([expect.stringContaining('No API key')]);
    });

    it.each([
        {
            provider: 'openai' as const,
            modelId: 'gpt-5.6-sol',
            response: [
                'data: {"type":"response.created","response":{"id":"response-1"}}',
                '',
                'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"message-1","type":"message","role":"assistant","status":"in_progress","content":[],"phase":"final_answer"}}',
                '',
                'data: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"Hello"}',
                '',
                'data: {"type":"response.output_item.done","output_index":0,"item":{"id":"message-1","type":"message","role":"assistant","status":"completed","phase":"final_answer","content":[{"type":"output_text","text":"Hello","annotations":[],"logprobs":[]}]}}',
                '',
                'data: {"type":"response.completed","response":{"id":"response-1","status":"completed","output":[],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}',
                '',
                'data: [DONE]',
                ''
            ].join('\n')
        },
        {
            provider: 'anthropic' as const,
            modelId: 'claude-sonnet-5',
            response: [
                'event: message_start',
                'data: {"type":"message_start","message":{"id":"message-1","type":"message","role":"assistant","model":"claude-sonnet-5","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"output_tokens":0}}}',
                '',
                'event: content_block_start',
                'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
                '',
                'event: content_block_delta',
                'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
                '',
                'event: content_block_stop',
                'data: {"type":"content_block_stop","index":0}',
                '',
                'event: message_delta',
                'data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":1}}',
                '',
                'event: message_stop',
                'data: {"type":"message_stop"}',
                '',
                ''
            ].join('\n')
        }
    ])('streams through the real $provider Pi browser adapter with a mocked response', async ({provider, modelId, response}) => {
        const fetch = vi.fn(() => Promise.resolve(new Response(response, {
            status: 200,
            headers: {'content-type': 'text/event-stream'}
        }))) as FetchFunction;
        const deltas: string[] = [];
        const errors: string[] = [];
        const access = new BrowserPiModelAccess({getApiKey: () => 'session-key', fetch});
        const runtime = access.createRuntime({
            provider,
            modelId,
            onEvent: (event) => {
                if (event.type === 'assistant-text-delta') {
                    deltas.push(event.text);
                } else if (event.type === 'run-error') {
                    errors.push(event.message);
                }
            }
        });

        await runtime.prompt('Say hello');

        expect(fetch).toHaveBeenCalledOnce();
        expect({deltas: deltas.join(''), errors, message: runtime.messages.at(-1)}).toMatchObject({
            deltas: 'Hello',
            errors: [],
            message: {role: 'assistant', text: 'Hello'}
        });
    });
});
