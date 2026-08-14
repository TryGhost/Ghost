/**
 * Slice-5 chat agent tests — seam-driven with a mocked provider (no network):
 * key-store behaviors, OpenAI provider request/response shape, the pure loop
 * contract, and the session-integrated tool semantics (candidate
 * accumulation, preview-before-commit, one-batch dirty count, safety rails)
 * through the same harness as edit-mode-session.test.js.
 */
import assert from 'node:assert/strict';
import {AGENT_TOOLS, MAX_AGENT_ITERATIONS, buildSystemPrompt, runAgentLoop} from '../src/edit-mode/agent/loop.js';
import {createKeyStore, validateApiKeyShape} from '../src/edit-mode/agent/key-store.js';
import {DEFAULT_OPENAI_MODEL, createOpenAiProvider} from '../src/edit-mode/agent/provider.js';
import {createEditSession, MAX_AGENT_EDIT_CHARS} from '../src/edit-mode/session.js';
import {createMemoryDraftStore} from '../src/edit-mode/draft-store.js';
import {
    ADMIN_URL,
    SCRIPT_URL,
    bootSession,
    createFakeAdminApi,
    createFakeClientFactory,
    createFakeInteractions,
    createFakeUi,
    createPageDom,
    editableElement,
    waitFor
} from './helpers/edit-mode-harness.js';

const TEST_KEY = 'sk-test-abcdefghijklmnop';

function memoryStorage() {
    const map = new Map();
    return {
        map,
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key)
    };
}

/**
 * A scripted provider: each step is either a {text?, toolCalls?} response or
 * a function of the request. Every complete() request is recorded (deep
 * copied) for request-shape assertions. Also acts as a providerFactory that
 * records its options.
 */
function createScriptedProvider(script) {
    const record = {calls: [], factoryOptions: []};

    const provider = {
        name: 'scripted',
        model: 'test-model',
        async complete(request) {
            record.calls.push(structuredClone({messages: request.messages, tools: request.tools}));
            const stepIndex = Math.min(record.calls.length - 1, script.length - 1);
            const step = script[stepIndex];
            return typeof step === 'function' ? step(request) : step;
        }
    };

    record.provider = provider;
    record.factory = (options) => {
        record.factoryOptions.push(options);
        return provider;
    };

    return record;
}

/** The last tool-result message the provider saw in a given recorded call. */
function lastToolMessage(recordedCall) {
    const toolMessages = recordedCall.messages.filter(message => message.role === 'tool');
    return toolMessages[toolMessages.length - 1];
}

async function bootAgentSession({script, keyStore, clientFactory, draftStore} = {}) {
    const scripted = createScriptedProvider(script ?? []);
    const storage = memoryStorage();
    const store = keyStore ?? createKeyStore({storage});

    if (!keyStore) {
        store.setKey(TEST_KEY);
    }

    const booted = await bootSession({
        ...(clientFactory ? {clientFactory} : {}),
        ...(draftStore ? {draftStore} : {}),
        deps: {
            keyStore: store,
            providerFactory: scripted.factory
        }
    });

    return {...booted, scripted, keyStore: store, storage};
}

describe('edit-mode agent', function () {
    describe('key store', function () {
        it('round-trips a key through the storage seam under a clearly-named provider-scoped key', function () {
            const storage = memoryStorage();
            const store = createKeyStore({storage});

            assert.equal(store.getKey(), null);
            store.setKey(`  ${TEST_KEY}  `);
            assert.equal(store.getKey(), TEST_KEY, 'the stored key is trimmed');
            assert.deepEqual([...storage.map.keys()], ['ghost-edit-mode-agent-api-key:openai']);

            store.clearKey();
            assert.equal(store.getKey(), null);
        });

        it('validates key shape loosely and rejects garbage with readable errors', function () {
            assert.match(validateApiKeyShape(''), /empty/);
            assert.match(validateApiKeyShape('sk-has spaces-inside'), /spaces/);
            assert.match(validateApiKeyShape('short'), /too short/);
            assert.equal(validateApiKeyShape(TEST_KEY), null);

            const store = createKeyStore({storage: memoryStorage()});
            assert.throws(() => store.setKey('nope'), /too short/);
            assert.equal(store.getKey(), null, 'a rejected key is never stored');
        });

        it('namespaces keys and models per provider', function () {
            const storage = memoryStorage();
            const openai = createKeyStore({storage, provider: 'openai'});
            const anthropic = createKeyStore({storage, provider: 'anthropic'});

            openai.setKey(TEST_KEY);
            assert.equal(anthropic.getKey(), null, 'one provider\'s key is never visible to another');

            openai.setModel('gpt-5-mini');
            assert.equal(openai.getModel(), 'gpt-5-mini');
            assert.equal(anthropic.getModel(), null);
            openai.setModel('');
            assert.equal(openai.getModel(), null, 'an empty model clears back to the provider default');
        });

        it('degrades to in-memory storage when sessionStorage is unusable', function () {
            const store = createKeyStore({storage: null}); // node: no globalThis.sessionStorage
            store.setKey(TEST_KEY);
            assert.equal(store.getKey(), TEST_KEY);
        });

        it('falls back to memory when the storage throws on WRITE (Safari private mode)', function () {
            // the storage object EXISTS and reads fine — only writes throw
            const writeThrowingStorage = {
                getItem: () => null,
                setItem: () => {
                    throw new Error('QuotaExceededError');
                },
                removeItem: () => {}
            };
            const store = createKeyStore({storage: writeThrowingStorage});

            store.setKey(TEST_KEY); // must not throw
            assert.equal(store.getKey(), TEST_KEY, 'the key is readable from the in-memory fallback');

            store.setModel('gpt-5-mini');
            assert.equal(store.getModel(), 'gpt-5-mini');
        });
    });

    describe('OpenAI provider', function () {
        function capturingFetch(response) {
            const requests = [];
            const fetchImpl = async (url, options) => {
                requests.push({url, options, body: JSON.parse(options.body)});
                return new Response(JSON.stringify(response), {status: 200, headers: {'content-type': 'application/json'}});
            };
            return {requests, fetchImpl};
        }

        const textResponse = {choices: [{message: {content: 'hello', tool_calls: []}}]};

        it('sends the key in the Authorization header ONLY, to the chat completions endpoint', async function () {
            const {requests, fetchImpl} = capturingFetch(textResponse);
            const provider = createOpenAiProvider({apiKey: TEST_KEY, fetchImpl});

            await provider.complete({messages: [{role: 'user', content: 'hi'}], tools: []});

            assert.equal(requests.length, 1);
            assert.equal(requests[0].url, 'https://api.openai.com/v1/chat/completions');
            assert.equal(requests[0].options.headers.Authorization, `Bearer ${TEST_KEY}`);
            assert.equal(requests[0].url.includes(TEST_KEY), false, 'key never in the URL');
            assert.equal(requests[0].options.body.includes(TEST_KEY), false, 'key never in the body');
            assert.equal(requests[0].body.model, DEFAULT_OPENAI_MODEL, 'defaults to a mini-tier model');
        });

        it('serializes the neutral message and tool shapes to OpenAI function calling', async function () {
            const {requests, fetchImpl} = capturingFetch(textResponse);
            const provider = createOpenAiProvider({apiKey: TEST_KEY, model: 'gpt-5-mini', endpoint: 'https://proxy.example.com/v1/', fetchImpl});

            await provider.complete({
                messages: [
                    {role: 'system', content: 'sys'},
                    {role: 'user', content: 'change the title'},
                    {role: 'assistant', content: null, toolCalls: [{id: 'call_1', name: 'read_theme_file', arguments: {path: 'index.hbs'}}]},
                    {role: 'tool', toolCallId: 'call_1', content: '<h1>Hi</h1>'}
                ],
                tools: AGENT_TOOLS
            });

            const {url, body} = requests[0];
            assert.equal(url, 'https://proxy.example.com/v1/chat/completions', 'endpoint override, trailing slash normalized');
            assert.equal(body.model, 'gpt-5-mini');
            assert.equal(body.tool_choice, 'auto');
            assert.deepEqual(body.messages[0], {role: 'system', content: 'sys'});
            assert.deepEqual(body.messages[2], {
                role: 'assistant',
                content: null,
                tool_calls: [{id: 'call_1', type: 'function', function: {name: 'read_theme_file', arguments: '{"path":"index.hbs"}'}}]
            });
            assert.deepEqual(body.messages[3], {role: 'tool', tool_call_id: 'call_1', content: '<h1>Hi</h1>'});

            assert.equal(body.tools.length, AGENT_TOOLS.length);
            const editTool = body.tools.find(tool => tool.function.name === 'edit_theme_file');
            assert.equal(editTool.type, 'function');
            assert.deepEqual(Object.keys(editTool.function.parameters.properties), ['path', 'old_string', 'new_string']);
            assert.equal(body.tools.some(tool => /publish/.test(tool.function.name)), false, 'no publish tool is ever offered');
        });

        it('parses tool calls, surviving malformed argument JSON as arguments: null', async function () {
            const {fetchImpl} = capturingFetch({
                choices: [{message: {
                    content: null,
                    tool_calls: [
                        {id: 'a', type: 'function', function: {name: 'preview', arguments: '{}'}},
                        {id: 'b', type: 'function', function: {name: 'edit_theme_file', arguments: '{not json'}}
                    ]
                }}]
            });
            const provider = createOpenAiProvider({apiKey: TEST_KEY, fetchImpl});

            const result = await provider.complete({messages: [], tools: []});

            assert.equal(result.text, null);
            assert.deepEqual(result.toolCalls[0], {id: 'a', name: 'preview', arguments: {}});
            assert.equal(result.toolCalls[1].arguments, null, 'malformed JSON becomes null for the loop to bounce back');
        });

        it('surfaces unknown tool-call types as an error instead of a silent "done"', async function () {
            const {fetchImpl} = capturingFetch({
                choices: [{message: {
                    content: null,
                    tool_calls: [
                        // no `type` at all — e.g. a future API shape this
                        // integration does not understand yet
                        {id: 'a', function: {name: 'preview', arguments: '{}'}}
                    ]
                }}]
            });
            const provider = createOpenAiProvider({apiKey: TEST_KEY, fetchImpl});

            await assert.rejects(
                () => provider.complete({messages: [], tools: []}),
                /unsupported tool call \(a missing type\)/
            );
        });

        it('throws readable errors (never echoing the key) on API failures', async function () {
            const failWith = (status, body) => createOpenAiProvider({
                apiKey: TEST_KEY,
                fetchImpl: async () => new Response(JSON.stringify(body), {status})
            });

            await assert.rejects(
                () => failWith(401, {error: {message: 'Incorrect API key provided'}}).complete({messages: [], tools: []}),
                (error) => {
                    assert.match(error.message, /rejected the API key \(401\)/);
                    assert.equal(error.message.includes(TEST_KEY), false);
                    return true;
                }
            );
            await assert.rejects(
                () => failWith(429, {error: {message: 'Rate limit reached'}}).complete({messages: [], tools: []}),
                /request failed \(429\): Rate limit reached/
            );
        });
    });

    describe('agent loop (pure, stub toolkit)', function () {
        const okToolkit = () => ({
            listThemeFiles: () => ({ok: true, output: 'index.hbs (10 chars)'}),
            readThemeFile: () => ({ok: true, output: 'source'}),
            editThemeFile: () => ({ok: true, output: 'staged'}),
            preview: () => ({ok: true, output: 'ok'}),
            commit: () => ({ok: true, output: 'committed'})
        });

        it('stops at the iteration cap when the model never finishes', async function () {
            const scripted = createScriptedProvider([
                {text: null, toolCalls: [{id: 'x', name: 'list_theme_files', arguments: {}}]}
            ]);

            const result = await runAgentLoop({provider: scripted.provider, prompt: 'loop forever', toolkit: okToolkit()});

            assert.equal(result.status, 'max_iterations');
            assert.equal(result.iterations, MAX_AGENT_ITERATIONS);
            assert.equal(scripted.calls.length, MAX_AGENT_ITERATIONS, 'exactly the cap, no more provider calls');
        });

        it('feeds unknown tools and unparseable arguments back to the model as tool errors', async function () {
            const scripted = createScriptedProvider([
                {toolCalls: [
                    {id: 'u', name: 'publish_theme', arguments: {}},
                    {id: 'p', name: 'edit_theme_file', arguments: null}
                ]},
                {text: 'giving up', toolCalls: []}
            ]);

            const result = await runAgentLoop({provider: scripted.provider, prompt: 'do it', toolkit: okToolkit()});

            assert.equal(result.status, 'done');
            const toolMessages = scripted.calls[1].messages.filter(message => message.role === 'tool');
            assert.match(toolMessages[0].content, /unknown tool "publish_theme"/);
            assert.match(toolMessages[1].content, /not valid JSON/);
        });

        it('threads the system prompt and conversation shape through the provider seam', async function () {
            const scripted = createScriptedProvider([{text: 'done', toolCalls: []}]);

            await runAgentLoop({
                provider: scripted.provider,
                prompt: 'make the title bigger',
                toolkit: okToolkit(),
                systemPrompt: buildSystemPrompt({themeName: 'casper'})
            });

            const {messages, tools} = scripted.calls[0];
            assert.equal(messages[0].role, 'system');
            assert.match(messages[0].content, /"casper"/);
            assert.match(messages[0].content, /cannot perform/);
            assert.deepEqual(messages[1], {role: 'user', content: 'make the title bigger'});
            assert.deepEqual(tools.map(tool => tool.name), ['list_theme_files', 'read_theme_file', 'edit_theme_file', 'preview', 'commit']);
        });

        it('aborts between steps when shouldAbort reports teardown', async function () {
            let aborted = false;
            const scripted = createScriptedProvider([
                {toolCalls: [{id: 'x', name: 'list_theme_files', arguments: {}}]}
            ]);

            const result = await runAgentLoop({
                provider: scripted.provider,
                prompt: 'x',
                toolkit: okToolkit(),
                shouldAbort: () => aborted,
                onProgress: () => {
                    aborted = true; // teardown lands after the first tool runs
                }
            });

            assert.equal(result.status, 'aborted');
            assert.equal(scripted.calls.length, 1, 'no further provider calls after abort');
        });
    });

    describe('session integration (runAgentTask)', function () {
        it('happy path: two staged edits + preview + commit land as ONE render-verified batch', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'list_theme_files', arguments: {}}]},
                {toolCalls: [{id: 'c2', name: 'read_theme_file', arguments: {path: 'index.hbs'}}]},
                {toolCalls: [
                    {id: 'c3', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: 'Agent title'}},
                    {id: 'c4', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Second para', new_string: 'Agent para'}}
                ]},
                {toolCalls: [{id: 'c5', name: 'preview', arguments: {}}]},
                {toolCalls: [{id: 'c6', name: 'commit', arguments: {summary: 'Retitled the homepage'}}]},
                {text: 'Done — retitled the homepage.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('Change the title and intro copy');

            assert.equal(result.status, 'done');
            assert.equal(result.commits, 1);
            assert.deepEqual(result.filesChanged, ['index.hbs']);
            assert.equal(result.text, 'Done — retitled the homepage.');
            assert.equal(result.resultText, '1 file changed — rendered OK (1 edit batch)');

            // ONE logical edit batch in the dirty count, despite two edits
            assert.equal(booted.ui.state.dirtyCount, 1);
            assert.equal(booted.ui.state.chat.busy, false);
            assert.equal(booted.ui.state.chat.resultText, result.resultText);

            // the read tool saw the real draft source
            assert.match(lastToolMessage(booted.scripted.calls[2]).content, /Original title/);

            // edits accumulated on the candidate: nothing hit the renderer
            // until preview — and commit SKIPS the re-render because the
            // exact previewed candidate object is what gets committed
            const client = booted.clientFactory.created[0];
            assert.equal(client.setThemeCalls.length, 1, 'preview renders once; commit reuses the verified render — staging edits never touches the renderer');
            assert.match(client.setThemeCalls[0]['index.hbs'], /Agent title/);
            assert.match(lastToolMessage(booted.scripted.calls[4]).content, /Preview rendered OK \(1 staged file\(s\)\)/);
            assert.match(lastToolMessage(booted.scripted.calls[5]).content, /Committed 1 file\(s\) as one draft edit — Retitled the homepage/);

            // the committed draft carries both edits in the visible preview
            assert.match(booted.dom.window.document.querySelector('h1').textContent, /Agent title/);
            assert.match(booted.dom.window.document.querySelector('p').textContent, /Agent para/);

            // chat transcript: user, 6 tool-progress lines, assistant
            const roles = booted.ui.state.chat.messages.map(message => message.role);
            assert.deepEqual(roles, ['user', 'progress', 'progress', 'progress', 'progress', 'progress', 'progress', 'assistant']);

            // the BYOK key went to the provider factory, and the model was
            // the store's (none set → provider default)
            assert.deepEqual(
                booted.scripted.factoryOptions.map(options => options.apiKey),
                [TEST_KEY]
            );
            assert.equal(booted.scripted.factoryOptions[0].model, undefined);
        });

        it('render-failure feedback loop: the model sees the error, fixes the draft, and succeeds', async function () {
            const clientFactory = createFakeClientFactory({
                setThemeShouldFail: theme => /Broken/.test(theme['index.hbs'])
            });
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: 'Broken title'}}]},
                {toolCalls: [{id: 'c2', name: 'preview', arguments: {}}]},
                {toolCalls: [{id: 'c3', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Broken title', new_string: 'Fixed title'}}]},
                {toolCalls: [{id: 'c4', name: 'preview', arguments: {}}]},
                {toolCalls: [{id: 'c5', name: 'commit', arguments: {summary: 'fixed'}}]},
                {text: 'Fixed after a render failure.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script, clientFactory});

            const result = await booted.session.runAgentTask('Retitle');

            // the failed preview's error text reached the model verbatim…
            assert.match(
                lastToolMessage(booted.scripted.calls[2]).content,
                /Error: the staged draft failed to render: candidate failed to compile/
            );
            // …the renderer was reverted to the last-good theme in between…
            const client = booted.clientFactory.created[0];
            assert.match(client.setThemeCalls[0]['index.hbs'], /Broken title/);
            assert.match(client.setThemeCalls[1]['index.hbs'], /Original title/, 'revert after the failed preview');
            // …and the fixed candidate landed as one committed batch
            assert.equal(result.status, 'done');
            assert.equal(result.commits, 1);
            assert.equal(booted.ui.state.dirtyCount, 1);
            assert.match(booted.dom.window.document.querySelector('h1').textContent, /Fixed title/);
        });

        it('stops at the iteration cap and reports it in the result line', async function () {
            const script = [
                {toolCalls: [{id: 'c', name: 'list_theme_files', arguments: {}}]}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('never finish');

            assert.equal(result.status, 'max_iterations');
            assert.equal(booted.scripted.calls.length, MAX_AGENT_ITERATIONS);
            assert.match(result.resultText, /stopped at the iteration cap/);
            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.equal(booted.ui.state.chat.busy, false);
        });

        it('rejects edits and reads on unknown or binary paths without touching anything', async function () {
            const script = [
                {toolCalls: [
                    {id: 'c1', name: 'edit_theme_file', arguments: {path: 'assets/logo.png', old_string: 'a', new_string: 'b'}},
                    {id: 'c2', name: 'read_theme_file', arguments: {path: 'no-such-file.hbs'}}
                ]},
                {text: 'Cannot edit that file.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('vandalize the logo');

            const toolMessages = booted.scripted.calls[1].messages.filter(message => message.role === 'tool');
            assert.match(toolMessages[0].content, /"assets\/logo\.png" is not an editable text file/);
            assert.match(toolMessages[1].content, /"no-such-file\.hbs" is not an editable text file/);
            assert.equal(result.commits, 0);
            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.equal(booted.clientFactory.created[0].setThemeCalls.length, 0, 'nothing ever reached the renderer');
        });

        it('enforces the per-task total edit size cap and ambiguous/missing matches', async function () {
            const huge = 'x'.repeat(MAX_AGENT_EDIT_CHARS + 1);
            const script = [
                {toolCalls: [
                    {id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: huge}},
                    {id: 'c2', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'not in the file', new_string: 'y'}},
                    {id: 'c3', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'i', new_string: 'y'}}
                ]},
                {text: 'Stopped.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('paste a novel into the theme');

            const toolMessages = booted.scripted.calls[1].messages.filter(message => message.role === 'tool');
            assert.match(toolMessages[0].content, /total edit size cap/);
            assert.match(toolMessages[1].content, /was not found in "index\.hbs"/);
            assert.match(toolMessages[2].content, /matches more than one place in "index\.hbs"/);
            assert.equal(result.commits, 0);
            assert.equal(booted.ui.state.dirtyCount, 0);
        });

        it('an uncommitted preview is rolled back when the task ends without commit', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: 'Abandoned title'}}]},
                {toolCalls: [{id: 'c2', name: 'preview', arguments: {}}]},
                {text: 'Actually, never mind.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('try something');

            assert.equal(result.commits, 0);
            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.match(result.resultText, /No changes committed — 1 staged edit\(s\) discarded/);
            // the preview swapped the candidate in, the task end swapped it back
            assert.match(booted.dom.window.document.querySelector('h1').textContent, /Original title/);
            const client = booted.clientFactory.created[0];
            assert.match(client.setThemeCalls[client.setThemeCalls.length - 1]['index.hbs'], /Original title/);
        });

        it('surfaces provider failures (e.g. bad key) in the chat without dirtying anything', async function () {
            const storage = memoryStorage();
            const keyStore = createKeyStore({storage});
            keyStore.setKey(TEST_KEY);

            const failingFactory = () => ({
                name: 'openai',
                model: 'x',
                complete: async () => {
                    throw new Error('OpenAI rejected the API key (401)');
                }
            });

            const booted = await bootSession({deps: {keyStore, providerFactory: failingFactory}});
            const result = await booted.session.runAgentTask('anything');

            assert.equal(result.status, 'error');
            assert.match(result.error, /rejected the API key/);
            assert.equal(booted.ui.state.dirtyCount, 0);
            const errorMessages = booted.ui.state.chat.messages.filter(message => message.role === 'error');
            assert.equal(errorMessages.length, 1);
            assert.match(errorMessages[0].text, /rejected the API key/);
            assert.equal(booted.ui.state.chat.busy, false);
        });

        it('lands new_string byte-verbatim, including $-replacement patterns', async function () {
            // String.replace would expand these; the splice must not
            const literal = 'A $& B $` C $\' D $1 E';
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: literal}}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {}}]},
                {text: 'done', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('insert dollar soup');

            assert.equal(result.commits, 1);
            const committed = booted.clientFactory.created[0].setThemeCalls[0]['index.hbs'];
            assert.ok(committed.includes(`<h1>${literal}</h1>`), 'the $-patterns land verbatim');
        });

        it('rejects a .json edit that breaks JSON.parse before anything is staged', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {
                    path: 'package.json',
                    old_string: '{"name":"fixture-theme"}',
                    new_string: '{"name":"fixture-theme" "version":"1.0.0"}' // dropped comma
                }}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {}}]},
                {text: 'gave up', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            const result = await booted.session.runAgentTask('bump the version');

            const toolMessages = booted.scripted.calls[1].messages.filter(message => message.role === 'tool');
            assert.match(toolMessages[0].content, /Error: "package\.json" is not valid JSON after this edit/);
            // nothing was staged: the follow-up commit finds nothing
            assert.match(lastToolMessage(booted.scripted.calls[2]).content, /nothing to commit/);
            assert.equal(result.commits, 0);
            assert.equal(booted.ui.state.dirtyCount, 0);
            assert.equal(booted.clientFactory.created[0].setThemeCalls.length, 0);
        });

        it('refuses human edit surfaces while a task runs (visible status, no state change)', async function () {
            const duringTask = {};
            const booted = await bootAgentSession({
                script: [
                    async () => {
                        // we are now mid-task: try every human write surface
                        booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
                        duringTask.editor = booted.ui.state.editor;
                        duringTask.selectStatus = booted.ui.state.statusText;

                        await booted.ui.handlers.onPublish();
                        duringTask.publishArmed = booted.ui.state.publishArmed;

                        booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:42'));
                        duringTask.imageEditor = booted.ui.state.imageEditor;

                        return {text: 'done', toolCalls: []};
                    }
                ]
            });

            await booted.session.runAgentTask('long task');

            assert.equal(duringTask.editor, null, 'no inline editor opens mid-task');
            assert.equal(duringTask.imageEditor, null, 'no image panel opens mid-task');
            assert.match(duringTask.selectStatus, /agent task is running/i, 'the refusal is visible');
            assert.equal(duringTask.publishArmed, false, 'publish does not even arm mid-task');
            assert.equal(booted.api.uploads.length, 0);
            assert.equal(booted.ui.state.dirtyCount, 0, 'nothing was committed by the refused surfaces');
        });

        it('preserves a human edit committed BEFORE the task under the agent\'s commit', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Second para', new_string: 'Agent para'}}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {}}]},
                {text: 'done', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
            await booted.ui.handlers.onCommitEdit('Human title');
            assert.equal(booted.ui.state.dirtyCount, 1);

            await booted.session.runAgentTask('change the para');

            assert.equal(booted.ui.state.dirtyCount, 2);
            const finalTheme = booted.clientFactory.created[0].theme['index.hbs'];
            assert.ok(finalTheme.includes('Human title'), 'the earlier human edit survives the agent commit');
            assert.ok(finalTheme.includes('Agent para'), 'the agent edit landed too');
        });

        it('commits a pending inline edit at task start (never silently discarded)', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Second para', new_string: 'Agent para'}}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {}}]},
                {text: 'done', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
            booted.ui.state.editor.value = 'Typed before the task';

            await booted.session.runAgentTask('change the para');

            assert.equal(booted.ui.state.editor, null, 'the editor is closed before the task runs');
            assert.equal(booted.ui.state.dirtyCount, 2, 'human commit + agent batch');
            const finalTheme = booted.clientFactory.created[0].theme['index.hbs'];
            assert.ok(finalTheme.includes('Typed before the task'), 'the pending edit was committed, not discarded');
            assert.ok(finalTheme.includes('Agent para'));
        });

        it('refuses to start while a publish is in flight', async function () {
            const api = createFakeAdminApi();
            const inner = api.fetchImpl;
            let releaseDownload;
            let gated = false;
            api.fetchImpl = async (url, options) => {
                if (gated && String(url).includes('/download/')) {
                    await new Promise((resolve) => {
                        releaseDownload = resolve;
                    });
                }
                return inner(url, options);
            };

            const scriptedBooted = await (async () => {
                const storage = memoryStorage();
                const store = createKeyStore({storage});
                store.setKey(TEST_KEY);
                const scripted = createScriptedProvider([{text: 'never reached', toolCalls: []}]);
                const booted = await bootSession({api, deps: {keyStore: store, providerFactory: scripted.factory}});
                return {...booted, scripted};
            })();

            // make an edit so publish is possible, then start publishing
            scriptedBooted.interactions.options.onSelect(editableElement(scriptedBooted.dom, 'index.hbs:1:1'));
            await scriptedBooted.ui.handlers.onCommitEdit('Edited title');
            await scriptedBooted.ui.handlers.onPublish(); // arm
            gated = true;
            const publishPromise = scriptedBooted.ui.handlers.onPublish(); // confirm — blocks on the download

            const result = await scriptedBooted.session.runAgentTask('while publishing');

            assert.equal(result.status, 'error');
            assert.equal(result.refused, true);
            assert.match(result.error, /Publishing is in progress/);
            assert.match(scriptedBooted.ui.state.chat.messages.at(-1).text, /Publishing is in progress/);
            assert.equal(scriptedBooted.scripted.calls.length, 0, 'the provider is never called');

            releaseDownload();
            await publishPromise;
            assert.equal(scriptedBooted.api.uploads.length, 1, 'the publish itself completes normally');
        });

        it('a prompt during boot surfaces a visible chat error and reports the refusal', async function () {
            // boot is stalled on the renderer client — the session exists,
            // the UI exists, but client/renderTheme are not ready yet
            const dom = createPageDom();
            const api = createFakeAdminApi();
            const ui = createFakeUi();
            const interactions = createFakeInteractions();

            let clientRequested = false;
            let resolveClient;
            const pendingClient = new Promise((resolve) => {
                resolveClient = resolve;
            });

            const session = createEditSession({
                config: {adminUrl: ADMIN_URL, key: '', scriptUrl: SCRIPT_URL},
                deps: {
                    doc: dom.window.document,
                    win: dom.window,
                    fetchImpl: api.fetchImpl,
                    draftStore: createMemoryDraftStore(),
                    startClient: () => {
                        clientRequested = true;
                        return pendingClient;
                    },
                    uiFactory: ui.factory,
                    attachInteractions: interactions.attach
                }
            });

            const startPromise = session.start();
            await waitFor(() => clientRequested);

            const result = await session.runAgentTask('too early');

            assert.equal(result.status, 'error');
            assert.equal(result.refused, true, 'the UI keeps the typed prompt on a refusal');
            assert.match(result.error, /still starting/);
            const errorMessages = ui.state.chat.messages.filter(message => message.role === 'error');
            assert.equal(errorMessages.length, 1, 'the refusal is VISIBLE in the chat transcript');
            assert.match(errorMessages[0].text, /still starting/);

            session.destroy();
            resolveClient({
                mode: 'main',
                async render() {
                    return {status: 200, html: '<html></html>', url: 'x'};
                },
                async setTheme() {},
                destroy() {}
            });
            await startPromise;
        });

        it('the publish arm step lists the changed files across human and agent commits', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {
                    path: 'package.json',
                    old_string: '"fixture-theme"',
                    new_string: '"fixture-theme-tweaked"'
                }}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {}}]},
                {text: 'done', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            booted.interactions.options.onSelect(editableElement(booted.dom, 'index.hbs:1:1'));
            await booted.ui.handlers.onCommitEdit('Human title');
            await booted.session.runAgentTask('tweak package.json');
            assert.equal(booted.ui.state.dirtyCount, 2);

            await booted.ui.handlers.onPublish(); // arm

            assert.equal(booted.ui.state.publishArmed, true);
            assert.match(booted.ui.state.statusText, /changed files: index\.hbs, package\.json/);
            assert.match(booted.ui.state.statusText, /Confirm publish/);
        });

        it('agent commits share the draft store and survive re-entry like manual edits', async function () {
            const script = [
                {toolCalls: [{id: 'c1', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: 'Persisted agent title'}}]},
                {toolCalls: [{id: 'c2', name: 'commit', arguments: {summary: 'retitle'}}]},
                {text: 'Done.', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            await booted.session.runAgentTask('retitle');
            assert.equal(booted.ui.state.dirtyCount, 1);
            booted.session.destroy();

            const second = await bootSession({api: booted.api, draftStore: booted.draftStore});
            assert.equal(second.ui.state.dirtyCount, 1);
            assert.match(second.dom.window.document.querySelector('h1').textContent, /Persisted agent title/);
        });
    });

    describe('chat UI state (via the uiFactory seam)', function () {
        it('boots with the chat closed, reflecting whether a key is stored', async function () {
            const withKey = await bootAgentSession({script: []});
            assert.deepEqual(withKey.ui.state.chat, {open: false, busy: false, hasKey: true, messages: [], resultText: null});

            const emptyStore = createKeyStore({storage: memoryStorage()});
            const withoutKey = await bootAgentSession({script: [], keyStore: emptyStore});
            assert.equal(withoutKey.ui.state.chat.hasKey, false);
        });

        it('toggles the drawer, and a prompt without a key opens the key setup instead of running', async function () {
            const emptyStore = createKeyStore({storage: memoryStorage()});
            const booted = await bootAgentSession({script: [], keyStore: emptyStore});

            booted.ui.handlers.onToggleChat();
            assert.equal(booted.ui.state.chat.open, true);

            const result = await booted.session.runAgentTask('do something');
            assert.equal(result.status, 'error');
            assert.match(result.error, /No API key/);
            assert.equal(booted.ui.state.chat.hasKey, false);
            assert.equal(booted.scripted.calls.length, 0, 'the provider is never constructed without a key');

            booted.ui.handlers.onToggleChat();
            assert.equal(booted.ui.state.chat.open, false);
        });

        it('save/clear key transitions hasKey and rejects malformed keys with a chat error', async function () {
            const store = createKeyStore({storage: memoryStorage()});
            const booted = await bootAgentSession({script: [], keyStore: store});

            booted.ui.handlers.onSaveApiKey('bad');
            assert.equal(booted.ui.state.chat.hasKey, false);
            assert.match(booted.ui.state.chat.messages.at(-1).text, /too short/);

            booted.ui.handlers.onSaveApiKey(TEST_KEY);
            assert.equal(booted.ui.state.chat.hasKey, true);
            assert.equal(store.getKey(), TEST_KEY);

            booted.ui.handlers.onClearApiKey();
            assert.equal(booted.ui.state.chat.hasKey, false);
            assert.equal(store.getKey(), null);
        });

        it('saving a key over a write-throwing storage still lands (fallback, no chat error)', async function () {
            const writeThrowingStorage = {
                getItem: () => null,
                setItem: () => {
                    throw new Error('QuotaExceededError');
                },
                removeItem: () => {}
            };
            const store = createKeyStore({storage: writeThrowingStorage});
            const booted = await bootAgentSession({script: [], keyStore: store});

            booted.ui.handlers.onSaveApiKey(TEST_KEY);

            assert.equal(booted.ui.state.chat.hasKey, true, 'the key is usable despite the throwing storage');
            assert.equal(store.getKey(), TEST_KEY);
            assert.equal(booted.ui.state.chat.messages.length, 0, 'no error line reaches the transcript');
        });

        it('onSendPrompt runs a task with busy shown while the provider works, and refuses concurrent tasks', async function () {
            let busyDuringRun = null;
            let secondResult = null;
            const booted = await bootAgentSession({
                script: [
                    async () => {
                        busyDuringRun = booted.ui.state.chat.busy;
                        secondResult = await booted.session.runAgentTask('concurrent');
                        return {text: 'done', toolCalls: []};
                    }
                ]
            });

            await booted.ui.handlers.onSendPrompt('first task');

            assert.equal(busyDuringRun, true, 'busy while the provider call is in flight');
            assert.equal(booted.ui.state.chat.busy, false);
            assert.equal(secondResult.status, 'error');
            assert.match(secondResult.error, /already running/);
            assert.equal(booted.ui.state.chat.messages[0].role, 'user');
            assert.equal(booted.ui.state.chat.messages[0].text, 'first task');
        });
    });

    describe('safety rails', function () {
        it('the agent toolkit never calls the Admin API', async function () {
            const script = [
                {toolCalls: [
                    {id: 'c1', name: 'list_theme_files', arguments: {}},
                    {id: 'c2', name: 'edit_theme_file', arguments: {path: 'index.hbs', old_string: 'Original title', new_string: 'T'}},
                    {id: 'c3', name: 'preview', arguments: {}},
                    {id: 'c4', name: 'commit', arguments: {}}
                ]},
                {text: 'done', toolCalls: []}
            ];
            const booted = await bootAgentSession({script});

            // count Admin API traffic before and after the whole task
            const uploadsBefore = booted.api.uploads.length;
            await booted.session.runAgentTask('edit something');

            assert.equal(booted.api.uploads.length, uploadsBefore, 'no theme upload — the agent cannot publish');
            assert.equal(booted.api.activations.length, 0);
            assert.equal(booted.api.imageUploads.length, 0);
            assert.equal(booted.ui.state.dirtyCount, 1, 'the commit stayed an in-memory draft');
        });
    });
});
