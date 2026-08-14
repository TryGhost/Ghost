/**
 * Chat drawer behavior of the real Preact overlay (ui.js) — the pieces the
 * fake-UI session harness cannot see: input handling around refused prompts
 * (slice-5 review finding: a refusal must not eat the typed text), and the
 * BYOK key setup's disclosure text + key/model rows.
 */
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createEditModeUi} from '../src/edit-mode/ui.js';

const tick = () => new Promise((resolve) => {
    setTimeout(resolve, 0);
});

describe('edit-mode ui (chat drawer)', function () {
    let dom;
    let savedGlobals;

    beforeEach(function () {
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {url: 'https://site.example.com/'});
        savedGlobals = {window: globalThis.window, document: globalThis.document};
        // preact renders against the global document
        globalThis.window = dom.window;
        globalThis.document = dom.window.document;
    });

    afterEach(function () {
        globalThis.window = savedGlobals.window;
        globalThis.document = savedGlobals.document;
    });

    function createUi(handlerOverrides = {}) {
        const calls = {prompts: [], keys: [], models: []};
        const handlers = {
            onExit: () => {},
            onPublish: () => {},
            onCommitEdit: () => {},
            onCancelEdit: () => {},
            onReplaceImage: () => {},
            onToggleChat: () => {},
            onSendPrompt: async (text) => {
                calls.prompts.push(text);
                return {status: 'done'};
            },
            onSaveApiKey: value => calls.keys.push(value),
            onSaveModel: value => calls.models.push(value),
            onClearApiKey: () => {},
            ...handlerOverrides
        };
        const ui = createEditModeUi({doc: dom.window.document, handlers});
        return {ui, calls, shadowRoot: ui.host.shadowRoot};
    }

    function pressEnter(input) {
        input.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    }

    it('restores the typed prompt when the session REFUSES it', async function () {
        const {ui, calls, shadowRoot} = createUi({
            onSendPrompt: async (text) => {
                calls.prompts.push(text);
                return {status: 'error', error: 'A chat task is already running', refused: true};
            }
        });
        ui.update({chat: {open: true, busy: false, hasKey: true, messages: [], resultText: null}});

        const input = shadowRoot.querySelector('input[aria-label="Ask for a theme change"]');
        assert.ok(input, 'the prompt input renders when a key is stored');
        input.value = 'make the title bigger';
        pressEnter(input);
        await tick();

        assert.deepEqual(calls.prompts, ['make the title bigger']);
        assert.equal(input.value, 'make the title bigger', 'a refused prompt is NOT eaten — the text comes back');
    });

    it('clears the input when the prompt actually runs', async function () {
        const {ui, calls, shadowRoot} = createUi();
        ui.update({chat: {open: true, busy: false, hasKey: true, messages: [], resultText: null}});

        const input = shadowRoot.querySelector('input[aria-label="Ask for a theme change"]');
        input.value = '  retitle the homepage  ';
        pressEnter(input);
        await tick();

        assert.deepEqual(calls.prompts, ['retitle the homepage'], 'the prompt is trimmed');
        assert.equal(input.value, '', 'a dispatched prompt clears the input');
    });

    it('key setup names the sessionStorage risk and wires the key and model rows', async function () {
        const {ui, calls, shadowRoot} = createUi();
        ui.update({chat: {open: true, busy: false, hasKey: false, messages: [], resultText: null}});

        const note = shadowRoot.querySelector('.chat-note');
        assert.match(note.textContent, /sessionStorage on your site’s origin/);
        assert.match(note.textContent, /any script running on your site could read it/);
        assert.match(note.textContent, /cleared when the tab closes/);
        assert.match(note.textContent, /never to Ghost/);

        const keyInput = shadowRoot.querySelector('input[aria-label="OpenAI API key"]');
        keyInput.value = 'sk-test-abcdefghijklmnop';
        pressEnter(keyInput);
        await tick();
        assert.deepEqual(calls.keys, ['sk-test-abcdefghijklmnop']);
        assert.equal(keyInput.value, '', 'the key input clears after save');

        const modelInput = shadowRoot.querySelector('input[aria-label="Model"]');
        assert.ok(modelInput, 'the model row renders in the key setup');
        modelInput.value = 'gpt-5-mini';
        pressEnter(modelInput);
        await tick();
        assert.deepEqual(calls.models, ['gpt-5-mini']);
    });
});
