/**
 * Browser-side agent loop for the edit-mode chat panel (slice 5).
 *
 * A bounded tool-calling loop over SESSION-SCOPED tools: the model stages
 * exact-string edits on a candidate copy of the draft theme, render-verifies
 * them via preview(), and lands them through the session's commitCandidate
 * pipeline as ONE logical edit batch per commit(). The loop itself is
 * provider-agnostic (see agent/provider.js for the seam) and knows nothing
 * about session internals — the session hands it a `toolkit` whose methods
 * return `{ok, output}`; `output` (a plain string) is what the model sees.
 *
 * LOOP CONTRACT:
 * - edits accumulate on the candidate; NOTHING touches live session state
 *   (dirty count, draft store, snapshot) until commit();
 * - a render failure inside preview/commit returns the error text to the
 *   model for self-correction — it is never fatal to the loop;
 * - the loop ends on a final assistant message (a completion with no tool
 *   calls), on the iteration cap, or when shouldAbort() reports the session
 *   is gone;
 * - SAFETY: there is deliberately NO publish tool — publishing stays the
 *   existing explicit human flow in the bar. Tools operate only on the
 *   in-memory draft theme, never on the Admin API.
 */

export const MAX_AGENT_ITERATIONS = 12;

/**
 * Tool definitions in the provider seam's neutral shape
 * ({name, description, parameters: JSON Schema}).
 */
export const AGENT_TOOLS = [
    {
        name: 'list_theme_files',
        description: 'List the editable text files of the theme draft (templates and JSON), with sizes. Only these files can be read or edited.',
        parameters: {type: 'object', properties: {}, additionalProperties: false}
    },
    {
        name: 'read_theme_file',
        description: 'Read the CURRENT DRAFT source of one theme file, including any edits already staged in this task.',
        parameters: {
            type: 'object',
            properties: {
                path: {type: 'string', description: 'Theme-relative path, exactly as listed (e.g. "partials/post-card.hbs")'}
            },
            required: ['path'],
            additionalProperties: false
        }
    },
    {
        name: 'edit_theme_file',
        description: 'Stage an exact-string replacement on the draft. old_string must match the current draft source exactly and uniquely — include enough surrounding context to be unambiguous. Stage multiple edits with multiple calls, then preview() and commit().',
        parameters: {
            type: 'object',
            properties: {
                path: {type: 'string', description: 'Theme-relative path of the file to edit'},
                old_string: {type: 'string', description: 'Exact text to replace (must occur exactly once in the current draft of the file)'},
                new_string: {type: 'string', description: 'Replacement text'}
            },
            required: ['path', 'old_string', 'new_string'],
            additionalProperties: false
        }
    },
    {
        name: 'preview',
        description: 'Render-verify the staged edits and show them in the on-page preview WITHOUT committing. On failure the render error is returned — fix the draft and preview again.',
        parameters: {type: 'object', properties: {}, additionalProperties: false}
    },
    {
        name: 'commit',
        description: 'Render-verify and commit ALL staged edits to the session draft as one edit batch. Does not publish anything — publishing is a separate human action.',
        parameters: {
            type: 'object',
            properties: {
                summary: {type: 'string', description: 'One-line summary of the committed change'}
            },
            additionalProperties: false
        }
    }
];

/**
 * @param {{themeName?: string}} [context]
 * @returns {string}
 */
export function buildSystemPrompt({themeName} = {}) {
    const theme = themeName ? `the active Handlebars theme "${themeName}"` : 'the active Handlebars theme';

    return [
        `You are a theme-editing assistant inside Ghost's on-site edit mode, working on a STAGED DRAFT of ${theme}.`,
        'Your edits are staged in memory, render-verified in the visible preview, and committed as draft batches. Nothing you do is ever published to the live site — publishing is a separate, explicit human action you cannot perform.',
        '',
        'Workflow:',
        '1. Use list_theme_files and read_theme_file to find the exact source to change. Always read a file before editing it.',
        '2. edit_theme_file stages an exact, unique string replacement against the current draft. Stage as many edits as the request needs.',
        '3. preview() renders the staged draft; if the render fails you get the error text back — fix the draft and preview again.',
        '4. commit({summary}) render-verifies and saves the staged edits as one batch. Always preview successfully before committing.',
        '',
        'Keep edits minimal and scoped to the user\'s request. When the task is done (or cannot proceed), reply with a short plain-text summary and make no further tool calls.'
    ].join('\n');
}

// Maps wire tool names to toolkit methods.
const TOOL_METHODS = {
    list_theme_files: 'listThemeFiles',
    read_theme_file: 'readThemeFile',
    edit_theme_file: 'editThemeFile',
    preview: 'preview',
    commit: 'commit'
};

/** One-line progress description of a tool call for the chat transcript. */
export function describeToolCall(call, result) {
    const path = call.arguments?.path ? ` ${call.arguments.path}` : '';
    return `${call.name}${path} — ${result.ok ? 'ok' : 'failed'}`;
}

async function executeToolCall(toolkit, call) {
    if (call.arguments === null || call.arguments === undefined) {
        return {ok: false, output: `Error: the arguments for ${call.name} were not valid JSON — retry the call with well-formed arguments.`};
    }

    const method = TOOL_METHODS[call.name];

    if (!method || typeof toolkit[method] !== 'function') {
        return {ok: false, output: `Error: unknown tool "${call.name}". Available tools: ${Object.keys(TOOL_METHODS).join(', ')}.`};
    }

    try {
        return await toolkit[method](call.arguments);
    } catch (error) {
        // Toolkit methods report expected failures via {ok: false}; a throw
        // here is a bug or a session teardown — still fed back as text so
        // the model can wrap up instead of the task crashing.
        return {ok: false, output: `Error: ${error.message}`};
    }
}

/**
 * @param {Object} options
 * @param {{complete(request: Object): Promise<{text?: string|null, toolCalls?: Array}>}} options.provider
 * @param {string} options.prompt — the user's natural-language request
 * @param {Object} options.toolkit — session-scoped tool implementations
 *   ({listThemeFiles, readThemeFile, editThemeFile, preview, commit}), each
 *   async-capable and returning {ok: boolean, output: string}
 * @param {string} [options.systemPrompt]
 * @param {(event: {type: string, text: string}) => void} [options.onProgress]
 * @param {number} [options.maxIterations]
 * @param {() => boolean} [options.shouldAbort] — checked before every
 *   provider call and tool execution (session teardown mid-task)
 * @returns {Promise<{status: 'done'|'max_iterations'|'aborted', text: string|null, iterations: number}>}
 *   Provider errors (network, bad key) REJECT — the caller owns surfacing
 *   them; tool failures never do.
 */
export async function runAgentLoop({
    provider,
    prompt,
    toolkit,
    systemPrompt = buildSystemPrompt(),
    onProgress,
    maxIterations = MAX_AGENT_ITERATIONS,
    shouldAbort = () => false
}) {
    const messages = [
        {role: 'system', content: systemPrompt},
        {role: 'user', content: prompt}
    ];

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        if (shouldAbort()) {
            return {status: 'aborted', text: null, iterations: iteration - 1};
        }

        const response = await provider.complete({messages, tools: AGENT_TOOLS});
        const toolCalls = response.toolCalls ?? [];

        if (toolCalls.length === 0) {
            return {status: 'done', text: response.text ?? '', iterations: iteration};
        }

        messages.push({role: 'assistant', content: response.text ?? null, toolCalls});

        for (const call of toolCalls) {
            if (shouldAbort()) {
                return {status: 'aborted', text: null, iterations: iteration};
            }

            const result = await executeToolCall(toolkit, call);
            onProgress?.({type: 'tool', text: describeToolCall(call, result)});
            messages.push({role: 'tool', toolCallId: call.id, content: result.output});
        }
    }

    return {status: 'max_iterations', text: null, iterations: maxIterations};
}
