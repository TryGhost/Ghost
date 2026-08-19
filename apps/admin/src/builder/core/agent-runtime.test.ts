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

    it('keeps a tool-using turn intact when the message bound falls inside its results', async () => {
        const contextRoles: string[][] = [];
        const responses = [
            message([
                {type: 'toolCall', id: 'first', name: 'record', arguments: {value: 'one'}},
                {type: 'toolCall', id: 'second', name: 'record', arguments: {value: 'two'}}
            ], 'toolUse'),
            message([{type: 'text', text: 'Finished'}], 'stop'),
            message([{type: 'text', text: 'Next'}], 'stop')
        ];
        const streamFn: StreamFn = (_model, context) => {
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

        expect(contextRoles).toEqual([
            ['user'],
            ['user', 'assistant', 'toolResult', 'toolResult'],
            ['user']
        ]);
    });
});
