/* eslint ghost/ghost-custom/no-native-error: off -- browser-side chunk code:
   errors surface in the edit-mode chat UI, not through Ghost's server error
   pipeline, so @tryghost/errors classes would only add bundle weight. */

/**
 * Chat-completions provider seam for the edit-mode agent (slice 5).
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
 * Maps the seam's neutral message shape to OpenAI chat-completions messages.
 * Exported for the request-shape tests.
 */
export function toOpenAiMessages(messages) {
    return messages.map((message) => {
        if (message.role === 'tool') {
            return {role: 'tool', tool_call_id: message.toolCallId, content: message.content};
        }

        if (message.role === 'assistant') {
            const out = {role: 'assistant', content: message.content ?? null};
            if (message.toolCalls?.length) {
                out.tool_calls = message.toolCalls.map(call => ({
                    id: call.id,
                    type: 'function',
                    function: {name: call.name, arguments: JSON.stringify(call.arguments ?? {})}
                }));
            }
            return out;
        }

        return {role: message.role, content: message.content};
    });
}

/** Maps the seam's neutral tool shape to OpenAI function-calling tools. */
export function toOpenAiTools(tools) {
    return tools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}

/**
 * The OpenAI implementation of the provider seam — plain fetch against the
 * chat completions API with function/tool calling, no SDK (keeps the chunk
 * small; the endpoint is a single POST).
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
                messages: toOpenAiMessages(messages)
            };

            if (tools.length > 0) {
                body.tools = toOpenAiTools(tools);
                body.tool_choice = 'auto';
            }

            const response = await fetchImpl(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
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

            const choice = data?.choices?.[0]?.message;

            if (!choice) {
                throw new Error('OpenAI returned no completion choice');
            }

            const toolCalls = (choice.tool_calls ?? [])
                .filter(call => call?.type === 'function' && call.function?.name)
                .map(call => ({
                    id: call.id,
                    name: call.function.name,
                    arguments: safeJsonParse(call.function.arguments ?? '')
                }));

            return {
                text: choice.content ?? null,
                toolCalls
            };
        }
    };
}
