import type {FetchFunction} from '@earendil-works/pi-ai';

import {BrowserPiModelAccess} from '@/builder/models/browser-pi-model-access';

import type {BuilderProvider} from '@/builder/models/curated-models';

function openAIResponse(call: number): string {
    if (call === 1) {
        return [
            'data: {"type":"response.created","response":{"id":"response-1"}}',
            '',
            'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"function-1","type":"function_call","call_id":"proof-tool","name":"record_proof","arguments":""}}',
            '',
            'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"value\\":\\"openai\\"}"}',
            '',
            'data: {"type":"response.function_call_arguments.done","output_index":0,"arguments":"{\\"value\\":\\"openai\\"}"}',
            '',
            'data: {"type":"response.output_item.done","output_index":0,"item":{"id":"function-1","type":"function_call","call_id":"proof-tool","name":"record_proof","arguments":"{\\"value\\":\\"openai\\"}"}}',
            '',
            'data: {"type":"response.completed","response":{"id":"response-1","status":"completed","output":[],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}',
            '',
            'data: [DONE]',
            ''
        ].join('\n');
    }

    return [
        'data: {"type":"response.created","response":{"id":"response-2"}}',
        '',
        'data: {"type":"response.output_item.added","output_index":0,"item":{"id":"message-2","type":"message","role":"assistant","status":"in_progress","content":[],"phase":"final_answer"}}',
        '',
        'data: {"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"Proof complete"}',
        '',
        'data: {"type":"response.output_item.done","output_index":0,"item":{"id":"message-2","type":"message","role":"assistant","status":"completed","phase":"final_answer","content":[{"type":"output_text","text":"Proof complete","annotations":[],"logprobs":[]}]}}',
        '',
        'data: {"type":"response.completed","response":{"id":"response-2","status":"completed","output":[],"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}',
        '',
        'data: [DONE]',
        ''
    ].join('\n');
}

function anthropicResponse(call: number): string {
    const events: Array<[string, Record<string, unknown>]> = call === 1 ? [
        ['message_start', {type: 'message_start', message: {id: 'message-1', type: 'message', role: 'assistant', model: 'claude-sonnet-5', content: [], stop_reason: null, stop_sequence: null, usage: {input_tokens: 1, output_tokens: 0}}}],
        ['content_block_start', {type: 'content_block_start', index: 0, content_block: {type: 'tool_use', id: 'proof-tool', name: 'record_proof', input: {}}}],
        ['content_block_delta', {type: 'content_block_delta', index: 0, delta: {type: 'input_json_delta', partial_json: '{"value":"anthropic"}'}}],
        ['content_block_stop', {type: 'content_block_stop', index: 0}],
        ['message_delta', {type: 'message_delta', delta: {stop_reason: 'tool_use', stop_sequence: null}, usage: {output_tokens: 1}}],
        ['message_stop', {type: 'message_stop'}]
    ] : [
        ['message_start', {type: 'message_start', message: {id: 'message-2', type: 'message', role: 'assistant', model: 'claude-sonnet-5', content: [], stop_reason: null, stop_sequence: null, usage: {input_tokens: 1, output_tokens: 0}}}],
        ['content_block_start', {type: 'content_block_start', index: 0, content_block: {type: 'text', text: ''}}],
        ['content_block_delta', {type: 'content_block_delta', index: 0, delta: {type: 'text_delta', text: 'Proof complete'}}],
        ['content_block_stop', {type: 'content_block_stop', index: 0}],
        ['message_delta', {type: 'message_delta', delta: {stop_reason: 'end_turn', stop_sequence: null}, usage: {output_tokens: 1}}],
        ['message_stop', {type: 'message_stop'}]
    ];

    return `${events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n`).join('\n')}\n`;
}

function proofFetch(provider: BuilderProvider, onCall: () => number): FetchFunction {
    return () => {
        const call = onCall();
        const body = provider === 'openai' ? openAIResponse(call) : anthropicResponse(call);
        return Promise.resolve(new Response(body, {
            status: 200,
            headers: {'content-type': 'text/event-stream'}
        }));
    };
}

export async function runBrowserRuntimeProof(provider: BuilderProvider): Promise<string> {
    let providerCalls = 0;
    const toolCalls: string[] = [];
    const access = new BrowserPiModelAccess({
        getApiKey: () => 'development-proof-key',
        fetch: proofFetch(provider, () => {
            providerCalls += 1;
            return providerCalls;
        })
    });
    const runtime = access.createRuntime({
        provider,
        modelId: provider === 'openai' ? 'gpt-5.6-sol' : 'claude-sonnet-5',
        tools: [{
            name: 'record_proof',
            description: 'Record the browser proof',
            inputSchema: {
                type: 'object',
                properties: {value: {type: 'string'}},
                required: ['value'],
                additionalProperties: false
            },
            execute: (input) => {
                toolCalls.push(String(input.value));
                return Promise.resolve({text: 'Proof recorded'});
            }
        }]
    });

    await runtime.prompt('Run the browser proof');
    if (providerCalls !== 2 || toolCalls.join(',') !== provider || runtime.messages.at(-1)?.text !== 'Proof complete') {
        throw new Error('The Pi browser provider tool loop did not complete.');
    }

    return `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} Pi provider proof passed`;
}
