import {createAssistantMessageEventStream} from '@earendil-works/pi-ai';
import {describe, expect, it, vi} from 'vitest';

import type {Api, AssistantMessage, Context, Model, SimpleStreamOptions} from '@earendil-works/pi-ai';
import type {StreamFn} from '@earendil-works/pi-agent-core';

import {createAgentRuntime} from './agent-runtime';

const model: Model<'openai-responses'> = {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    api: 'openai-responses',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    reasoning: true,
    input: ['text', 'image'],
    cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0},
    contextWindow: 272000,
    maxTokens: 128000
};

const usage = {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 2,
    cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}
};

function message(content: AssistantMessage['content'], stopReason: AssistantMessage['stopReason']): AssistantMessage {
    return {
        role: 'assistant',
        content,
        api: model.api,
        provider: model.provider,
        model: model.id,
        usage,
        stopReason,
        timestamp: Date.now()
    };
}

function completedStream(finalMessage: AssistantMessage, delta?: string) {
    const stream = createAssistantMessageEventStream();

    queueMicrotask(() => {
        stream.push({type: 'start', partial: {...finalMessage, content: []}});
        if (delta) {
            stream.push({type: 'text_delta', contentIndex: 0, delta, partial: finalMessage});
        }
        stream.push({type: 'done', reason: finalMessage.stopReason === 'toolUse' ? 'toolUse' : 'stop', message: finalMessage});
        stream.end(finalMessage);
    });

    return stream;
}

describe('agent runtime', () => {
    it('translates Pi events and executes tool calls sequentially', async () => {
        const calls: string[] = [];
        const providerCalls: Context[] = [];
        const responses = [
            message([
                {type: 'toolCall', id: 'first', name: 'record', arguments: {value: 'one'}},
                {type: 'toolCall', id: 'second', name: 'record', arguments: {value: 'two'}}
            ], 'toolUse'),
            message([{type: 'text', text: 'Finished'}], 'stop')
        ];
        const streamFn: StreamFn = vi.fn((_model: Model<Api>, context: Context, _options?: SimpleStreamOptions) => {
            providerCalls.push(context);
            const response = responses.shift();
            if (!response) {
                throw new Error('Unexpected provider call');
            }
            return completedStream(response, response.stopReason === 'stop' ? 'Finished' : undefined);
        });
        const events: string[] = [];
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn,
            tools: [{
                name: 'record',
                description: 'Record a value',
                inputSchema: {
                    type: 'object',
                    properties: {value: {type: 'string'}},
                    required: ['value'],
                    additionalProperties: false
                },
                execute: (input) => {
                    calls.push(String(input.value));
                    return Promise.resolve({text: `Recorded ${String(input.value)}`});
                }
            }],
            onEvent: event => events.push(event.type)
        });

        await runtime.prompt('Make two changes');

        expect(calls).toEqual(['one', 'two']);
        expect(providerCalls).toHaveLength(2);
        expect(events).toContain('assistant-text-delta');
        expect(events.filter(type => type === 'tool-start')).toHaveLength(2);
        expect(events.filter(type => type === 'tool-end')).toHaveLength(2);
        expect(events.at(-1)).toBe('run-end');
    });

    it('marks a canonical failed tool envelope as an error while preserving its structured details', async () => {
        const providerCalls: Context[] = [];
        const responses = [
            message([{type: 'toolCall', id: 'invalid-call', name: 'change', arguments: {}}], 'toolUse'),
            message([{type: 'text', text: 'repaired'}], 'stop')
        ];
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn: (_model, context) => {
                providerCalls.push(context);
                const response = responses.shift();
                if (!response) {
                    throw new Error('Unexpected provider call');
                }
                return completedStream(response);
            },
            tools: [{
                name: 'change',
                description: 'Change the candidate',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: () => Promise.resolve({
                    text: '{"ok":false,"revision":"revision-0","error":{"code":"render_failed"}}',
                    details: {ok: false, revision: 'revision-0', error: {code: 'render_failed', message: 'Invalid template', retryable: true}}
                })
            }]
        });

        await runtime.prompt('Make a change');

        expect(providerCalls[1]?.messages.at(-1)).toMatchObject({
            role: 'toolResult',
            isError: true,
            details: {ok: false, revision: 'revision-0', error: {code: 'render_failed'}}
        });
    });

    it('compacts an active tool cycle when image payloads exceed the request budget', async () => {
        const providerCalls: Context[] = [];
        const responses = [
            message([{type: 'toolCall', id: 'screenshot-call', name: 'screenshot', arguments: {}}], 'toolUse'),
            message([{type: 'text', text: 'continued'}], 'stop')
        ];
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            maxImageCharacters: 100,
            streamFn: (_model, context) => {
                providerCalls.push(context);
                const response = responses.shift();
                if (!response) {
                    throw new Error('Unexpected provider call');
                }
                return completedStream(response);
            },
            tools: [{
                name: 'screenshot',
                description: 'Capture the preview',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: () => Promise.resolve({
                    text: 'Screenshot captured',
                    attachments: [{type: 'image', mediaType: 'image/png', data: 'A'.repeat(1_000)}]
                })
            }]
        });

        await runtime.prompt('Inspect the preview');

        expect(providerCalls[1]?.messages.map(item => item.role)).toEqual(['user']);
        expect(JSON.stringify(providerCalls[1]?.messages)).toContain('image omitted from compacted context');
        expect(JSON.stringify(providerCalls[1]?.messages)).not.toContain('A'.repeat(100));
    });

    it('propagates abort to an active provider stream', async () => {
        let receivedSignal: AbortSignal | undefined;
        const streamFn: StreamFn = (_model, _context, options) => {
            receivedSignal = options?.signal;
            const stream = createAssistantMessageEventStream();
            options?.signal?.addEventListener('abort', () => {
                const aborted = message([], 'aborted');
                stream.push({type: 'error', reason: 'aborted', error: aborted});
                stream.end(aborted);
            }, {once: true});
            return stream;
        };
        const events: string[] = [];
        const runtime = createAgentRuntime({model, getApiKey: () => 'session-key', streamFn, onEvent: event => events.push(event.type)});

        const prompt = runtime.prompt('Wait');
        await vi.waitFor(() => expect(receivedSignal).toBeDefined());
        runtime.abort();
        await prompt;

        expect(receivedSignal?.aborted).toBe(true);
        expect(events).toContain('run-aborted');
    });

    it('propagates abort after the provider requests a tool', async () => {
        let toolStarted = false;
        let toolExecuted = false;
        const events: string[] = [];
        const streamFn: StreamFn = (_model, _context, options) => {
            if (options?.signal?.aborted) {
                const aborted = message([], 'aborted');
                const stream = createAssistantMessageEventStream();
                queueMicrotask(() => {
                    stream.push({type: 'error', reason: 'aborted', error: aborted});
                    stream.end(aborted);
                });
                return stream;
            }
            return completedStream(message([
                {type: 'toolCall', id: 'waiting-tool', name: 'wait', arguments: {}}
            ], 'toolUse'));
        };
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn,
            tools: [{
                name: 'wait',
                description: 'Wait for abort',
                inputSchema: {type: 'object', properties: {}, additionalProperties: false},
                execute: () => {
                    toolExecuted = true;
                    return Promise.resolve({text: 'Stopped'});
                }
            }],
            onEvent: (event) => {
                events.push(event.type);
                if (event.type === 'tool-start') {
                    toolStarted = true;
                    queueMicrotask(() => runtime.abort());
                }
            }
        });

        await runtime.prompt('Use the wait tool');

        expect(toolStarted).toBe(true);
        expect(toolExecuted).toBe(false);
        expect(events).toContain('run-aborted');
    });

    it('bounds provider context without exposing Pi messages', async () => {
        const contextSizes: number[] = [];
        const streamFn: StreamFn = (_model, context) => {
            contextSizes.push(context.messages.length);
            return completedStream(message([{type: 'text', text: 'ok'}], 'stop'));
        };
        const runtime = createAgentRuntime({model, getApiKey: () => 'session-key', streamFn, maxMessages: 3});

        await runtime.prompt('one');
        await runtime.prompt('two');
        await runtime.prompt('three');

        expect(contextSizes).toEqual([1, 3, 3]);
        expect(runtime.messages.every(item => item.role === 'user' || item.role === 'assistant' || item.role === 'tool')).toBe(true);
    });

    it('bounds imported Builder conversation history at a user-turn boundary', async () => {
        const contexts: Context[] = [];
        const streamFn: StreamFn = (_model, context) => {
            contexts.push(context);
            return completedStream(message([{type: 'text', text: 'ok'}], 'stop'));
        };
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn,
            maxMessages: 3,
            initialMessages: [
                {role: 'user', text: 'old request'},
                {role: 'assistant', text: 'old answer'},
                {role: 'user', text: 'recent request'},
                {role: 'assistant', text: 'recent answer'}
            ]
        });

        await runtime.prompt('current request');

        expect(contexts[0]?.messages.map(item => item.role)).toEqual(['user', 'assistant', 'user']);
        expect(contexts[0]?.messages.map(item => 'content' in item ? item.content : null)).toEqual([
            'recent request',
            [{type: 'text', text: 'recent answer'}],
            [{type: 'text', text: 'current request'}]
        ]);
    });

    it('drops whole older turns when imported history exceeds the character budget', async () => {
        const contexts: Context[] = [];
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn: (_model, context) => {
                contexts.push(context);
                return completedStream(message([{type: 'text', text: 'ok'}], 'stop'));
            },
            maxMessages: 20,
            maxCharacters: 50,
            initialMessages: [
                {role: 'user', text: 'old request '.repeat(20)},
                {role: 'assistant', text: 'old answer'},
                {role: 'user', text: 'recent request'},
                {role: 'assistant', text: 'recent answer'}
            ]
        });

        await runtime.prompt('current request');

        expect(contexts[0]?.messages.map(item => item.role)).toEqual(['user', 'assistant', 'user']);
        expect(JSON.stringify(contexts[0]?.messages)).not.toContain('old request');
    });

    it('compacts an oversized current tool cycle without sending orphaned tool results', async () => {
        const contextRoles: string[][] = [];
        const contexts: Context[] = [];
        const responses = [
            message([
                {type: 'toolCall', id: 'first', name: 'record', arguments: {value: 'one'}},
                {type: 'toolCall', id: 'second', name: 'record', arguments: {value: 'two'}}
            ], 'toolUse'),
            message([{type: 'text', text: 'Finished'}], 'stop'),
            message([{type: 'text', text: 'Next'}], 'stop')
        ];
        const streamFn: StreamFn = (_model, context) => {
            contexts.push(context);
            contextRoles.push(context.messages.map(item => item.role));
            const response = responses.shift();
            if (!response) {
                throw new Error('Unexpected provider call');
            }
            return completedStream(response);
        };
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            streamFn,
            maxMessages: 2,
            tools: [{
                name: 'record',
                description: 'Record a value',
                inputSchema: {type: 'object', properties: {value: {type: 'string'}}},
                execute: () => Promise.resolve({text: 'Recorded'})
            }]
        });

        await runtime.prompt('Use both tools');
        await runtime.prompt('Start another turn');

        expect(contextRoles).toEqual([['user'], ['user'], ['user']]);
        expect(JSON.stringify(contexts[1]?.messages)).toContain('Earlier Builder tool activity compacted');
        expect(JSON.stringify(contexts[1]?.messages)).toContain('Recorded');
    });

    it('preserves the complete current user request when compacting older tool cycles', async () => {
        const contexts: Context[] = [];
        const currentRequest = 'Keep the hero blue. FINAL CONSTRAINT: do not change the navigation.';
        const responses = [
            message([{type: 'toolCall', id: 'first', name: 'record', arguments: {value: 'first'}}], 'toolUse'),
            message([{type: 'toolCall', id: 'second', name: 'record', arguments: {value: 'second'}}], 'toolUse'),
            message([{type: 'text', text: 'Finished'}], 'stop')
        ];
        const runtime = createAgentRuntime({
            model,
            getApiKey: () => 'session-key',
            maxCharacters: 180,
            streamFn: (_model, context) => {
                contexts.push(context);
                const response = responses.shift();
                if (!response) {
                    throw new Error('Unexpected provider call');
                }
                return completedStream(response);
            },
            tools: [{
                name: 'record',
                description: 'Record a value',
                inputSchema: {type: 'object', properties: {value: {type: 'string'}}},
                execute: input => Promise.resolve({
                    text: input.value === 'first' ? 'Older result '.repeat(20) : 'Newest result'
                })
            }]
        });

        await runtime.prompt(currentRequest);

        const compactedUser = contexts[2]?.messages[0];
        expect(compactedUser?.role).toBe('user');
        expect(JSON.stringify(compactedUser && 'content' in compactedUser ? compactedUser.content : '')).toContain(currentRequest);
    });
});
