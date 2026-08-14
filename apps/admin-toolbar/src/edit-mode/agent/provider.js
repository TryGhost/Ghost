/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode chat UI, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * Provider seam for the edit-mode agent (slice 5).
 *
 * THE SEAM (provider-agnostic — an Anthropic/other implementation is a
 * drop-in as long as it satisfies this shape):
 *
 *   provider = {
 *       name:  string,           // 'openai', 'anthropic', …
 *       model: string,           // the resolved model id in use
 *       async complete({messages, tools}) → {text, toolCalls}
 *   }
 *
 * `messages` (the loop's neutral conversation shape — each provider maps it
 * to its own wire format):
 *   {role: 'system',    content: string}
 *   {role: 'user',      content: string}
 *   {role: 'assistant', content: string|null, toolCalls?: ToolCall[]}
 *   {role: 'tool',      toolCallId: string, content: string}
 *
 * `tools`: [{name, description, parameters}] where `parameters` is a JSON
 * Schema object (the neutral function-calling shape both OpenAI and
 * Anthropic accept with trivial renaming — Anthropic calls it
 * `input_schema`).
 *
 * Return value:
 *   text      — assistant prose, or null when the turn is tool-calls only
 *   toolCalls — [{id, name, arguments}] where `arguments` is the parsed
 *               object, or null when the model emitted unparseable JSON
 *               (the loop feeds that back as a tool error, letting the
 *               model self-correct instead of crashing the task)
 *
 * The OpenAI implementation speaks the RESPONSES API (`/v1/responses`), not
 * chat completions: current reasoning models (gpt-5.x) reject function tools
 * on `/v1/chat/completions` unless reasoning is disabled outright ("To use
 * function tools, use /v1/responses"). The request is stateless — the full
 * conversation is sent as `input` every turn, with `store: false` so OpenAI
 * never persists it server-side.
 *
 * SAFETY: the API key goes into the Authorization header of requests to the
 * provider endpoint and NOWHERE else — never into URLs, logs, thrown error
 * messages, or any Ghost/Admin API request.
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';
export const DEFAULT_OPENAI_ENDPOINT = 'https://api.openai.com/v1';

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

/**
 * Maps the seam's neutral message shape to Responses-API input items:
 * plain role/content items for system/user/assistant prose, and dedicated
 * `function_call` / `function_call_output` items (paired by `call_id`) for
 * the tool loop. Exported for the request-shape tests.
 */
export function toOpenAiInput(messages) {
    const input = [];

    for (const message of messages) {
        if (message.role === 'tool') {
            input.push({type: 'function_call_output', call_id: message.toolCallId, output: message.content});
        } else if (message.role === 'assistant') {
            if (message.content) {
                input.push({role: 'assistant', content: message.content});
            }
            for (const call of message.toolCalls ?? []) {
                input.push({
                    type: 'function_call',
                    call_id: call.id,
                    name: call.name,
                    arguments: JSON.stringify(call.arguments ?? {})
                });
            }
        } else {
            input.push({role: message.role, content: message.content});
        }
    }

    return input;
}

/** Maps the seam's neutral tool shape to Responses-API function tools. */
export function toOpenAiTools(tools) {
    return tools.map(tool => ({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        // strict mode is the Responses-API default and rejects schemas with
        // optional properties (e.g. commit's optional `summary`) — the
        // seam's schemas are deliberately lenient, so opt out explicitly
        strict: false
    }));
}

/**
 * The OpenAI implementation of the provider seam — plain fetch against the
 * Responses API with function calling, no SDK (keeps the chunk small; the
 * endpoint is a single POST).
 *
 * @param {Object} options
 * @param {string} options.apiKey — BYOK key from the key store; sent ONLY as
 *   the Authorization bearer of requests to `endpoint`
 * @param {string} [options.model] — defaults to a current mini-tier model
 * @param {string} [options.endpoint] — override for proxies/compatible APIs
 * @param {typeof fetch} [options.fetchImpl]
 */
export function createOpenAiProvider({apiKey, model = DEFAULT_OPENAI_MODEL, endpoint = DEFAULT_OPENAI_ENDPOINT, fetchImpl = (...args) => fetch(...args)}) {
    if (!apiKey) {
        throw new Error('An API key is required to create the provider');
    }

    return {
        name: 'openai',
        model,
        async complete({messages, tools = []}) {
            const body = {
                model,
                input: toOpenAiInput(messages),
                store: false
            };

            if (tools.length > 0) {
                body.tools = toOpenAiTools(tools);
                body.tool_choice = 'auto';
            }

            const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}/responses`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                // Surface the provider's own message; NEVER echo the key.
                const detail = data?.error?.message ? `: ${data.error.message}` : '';
                if (response.status === 401) {
                    throw new Error(`OpenAI rejected the API key (401)${detail}`);
                }
                throw new Error(`OpenAI request failed (${response.status})${detail}`);
            }

            const output = data?.output;

            if (!Array.isArray(output)) {
                throw new Error('OpenAI returned no output');
            }

            const textParts = [];
            const toolCalls = [];
            let sawMessage = false;

            for (const item of output) {
                if (item?.type === 'message') {
                    sawMessage = true;
                    for (const part of item.content ?? []) {
                        if (part?.type === 'output_text' && typeof part.text === 'string') {
                            textParts.push(part.text);
                        } else if (part?.type === 'refusal' && typeof part.refusal === 'string') {
                            textParts.push(part.refusal);
                        }
                    }
                } else if (item?.type === 'function_call') {
                    if (typeof item.name !== 'string' || !item.name) {
                        throw new Error('OpenAI returned a function call without a name — this provider integration cannot route it');
                    }
                    toolCalls.push({
                        id: item.call_id,
                        name: item.name,
                        arguments: safeJsonParse(item.arguments ?? '')
                    });
                } else if (item?.type === 'reasoning') {
                    // reasoning traces ride along on reasoning models — no
                    // content this integration consumes
                } else {
                    // An output item of an unknown type must SURFACE, not be
                    // silently dropped — dropping a call-like item would end
                    // the loop as a false 'done' while the model believes
                    // its calls are pending.
                    const label = typeof item?.type === 'string' && item.type ? `"${item.type}"` : 'a missing type';
                    throw new Error(`OpenAI returned an unsupported output item (${label}) — this provider integration only handles messages and function calls`);
                }
            }

            if (!sawMessage && toolCalls.length === 0) {
                throw new Error('OpenAI returned no completion');
            }

            return {
                text: sawMessage ? textParts.join('') : null,
                toolCalls
            };
        }
    };
}
