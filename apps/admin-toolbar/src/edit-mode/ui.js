/**
 * Edit-mode chunk UI — minimal Preact, rendered into its OWN shadow root
 * (host: #ghost-admin-toolbar-edit-overlay) so theme CSS can't bleed in and
 * the overlay survives every document swap (the swapper preserves the host).
 *
 * Three pieces, all driven by a plain state object via `update(patch)`:
 * - the edit-mode bar (theme name, dirty count, publish, exit, status line).
 *   Publishing is a TWO-STEP confirm inside the bar: the first click arms the
 *   button (`publishArmed`), the second click actually publishes — no
 *   window.confirm, so the flow is testable through the session's UI seam;
 * - the hover highlight (an outline overlay positioned from the hovered
 *   element's bounding rect — NOT shadow-DOM-bound, it just draws on top);
 * - the inline text editor (a small floating input over the clicked element;
 *   Enter commits, Escape cancels — deliberately spike-simple);
 * - the image editor (`imageEditor` state, opened for marked <img> elements):
 *   the same floating affordance with a Replace-image button instead of an
 *   input — the file picker, upload, and attribute swap live in the session;
 *   the bar's status line shows the uploading state;
 * - the chat drawer (`chat` state, toggled from the bar): message list
 *   (user/assistant/tool-progress/error lines), prompt input, busy state,
 *   per-task result line, and — when no key is stored — the BYOK key setup
 *   with an explicit note that the key stays in this browser's localStorage
 *   and is sent only to the provider. All agent logic lives in the session;
 *   the drawer only renders `chat` and fires the chat handlers.
 */
import {h, render} from 'preact';

export const OVERLAY_HOST_ID = 'ghost-admin-toolbar-edit-overlay';

const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.bar {
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 2147483000; display: flex; align-items: center; gap: 12px;
    padding: 8px 12px; border-radius: 8px; background: #15171a; color: #fff;
    font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,.35); max-width: min(720px, calc(100vw - 32px));
}
.bar strong { font-weight: 700; }
.bar .status { color: #c5c9d1; white-space: pre-line; max-height: 120px; overflow-y: auto; }
.bar .status.error { color: #ff8f8f; }
.bar button {
    appearance: none; border: 0; border-radius: 6px; padding: 5px 10px;
    font: 600 12px/1.4 inherit; cursor: pointer; color: #fff; background: #394047;
}
.bar button.publish { background: #30cf43; color: #15171a; }
.bar button:disabled { opacity: .5; cursor: default; }
.highlight {
    position: fixed; z-index: 2147482998; pointer-events: none;
    outline: 2px solid #14b8ff; outline-offset: 1px; border-radius: 2px;
    background: rgba(20, 184, 255, .08);
}
.editor {
    position: fixed; z-index: 2147483001; display: flex; gap: 6px;
    padding: 6px; border-radius: 8px; background: #15171a;
    box-shadow: 0 4px 16px rgba(0,0,0,.35);
}
.editor input {
    min-width: 240px; border: 1px solid #394047; border-radius: 6px;
    padding: 5px 8px; font: 400 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #23262b; color: #fff; outline: none;
}
.editor button {
    appearance: none; border: 0; border-radius: 6px; padding: 5px 10px;
    font: 600 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer; color: #fff; background: #394047;
}
.editor button.save { background: #14b8ff; color: #15171a; }
.chat {
    position: fixed; top: 72px; right: 16px; z-index: 2147483000;
    display: flex; flex-direction: column; gap: 8px;
    width: 340px; max-height: min(480px, calc(100vh - 96px));
    padding: 10px; border-radius: 10px; background: #15171a; color: #fff;
    font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,.35);
}
.chat-messages { flex: 1; min-height: 40px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.chat-msg { white-space: pre-wrap; word-break: break-word; border-radius: 6px; padding: 6px 8px; }
.chat-msg.user { background: #2b3742; align-self: flex-end; max-width: 90%; }
.chat-msg.assistant { background: #23262b; align-self: flex-start; max-width: 90%; }
.chat-msg.progress { color: #8b939e; font-size: 12px; padding: 0 8px; }
.chat-msg.error { color: #ff8f8f; background: #2b1d1d; }
.chat-result { color: #c5c9d1; font-size: 12px; border-top: 1px solid #394047; padding-top: 6px; }
.chat-busy { color: #8b939e; font-size: 12px; padding: 0 8px; }
.chat-row { display: flex; gap: 6px; }
.chat-row input {
    flex: 1; min-width: 0; border: 1px solid #394047; border-radius: 6px;
    padding: 6px 8px; font: inherit; background: #23262b; color: #fff; outline: none;
}
.chat-row button {
    appearance: none; border: 0; border-radius: 6px; padding: 6px 10px;
    font: 600 12px/1.4 inherit; cursor: pointer; color: #15171a; background: #14b8ff;
}
.chat-row button:disabled { opacity: .5; cursor: default; }
.chat-note { margin: 0; color: #8b939e; font-size: 12px; }
.chat-footer { display: flex; justify-content: flex-end; }
.chat-footer button {
    appearance: none; border: 0; background: none; padding: 0;
    color: #8b939e; font: 500 11px/1.4 inherit; cursor: pointer; text-decoration: underline;
}
`;

function Highlight({rect}) {
    if (!rect) {
        return null;
    }

    return h('div', {
        className: 'highlight',
        style: `top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;`
    });
}

function InlineEditor({editor, onCommit, onCancel}) {
    if (!editor) {
        return null;
    }

    const top = Math.max(8, editor.rect.top - 4);
    const left = Math.max(8, editor.rect.left);

    return h('div', {className: 'editor', style: `top:${top}px;left:${left}px;`}, [
        h('input', {
            type: 'text',
            value: editor.value,
            autoFocus: true,
            ref: (node) => {
                if (node && !node.dataset.focused) {
                    node.dataset.focused = 'true';
                    node.focus();
                    node.select();
                }
            },
            onInput: (event) => {
                editor.value = event.currentTarget.value;
            },
            onKeyDown: (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommit(event.currentTarget.value);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    onCancel();
                }
            }
        }),
        h('button', {
            type: 'button',
            className: 'save',
            onClick: (event) => {
                const input = event.currentTarget.parentElement.querySelector('input');
                onCommit(input.value);
            }
        }, 'Save'),
        h('button', {type: 'button', onClick: onCancel}, 'Cancel')
    ]);
}

function ImageEditor({imageEditor, busy, onReplace, onCancel}) {
    if (!imageEditor) {
        return null;
    }

    const top = Math.max(8, imageEditor.rect.top - 4);
    const left = Math.max(8, imageEditor.rect.left);

    return h('div', {className: 'editor', style: `top:${top}px;left:${left}px;`}, [
        h('button', {
            type: 'button',
            className: 'save',
            disabled: busy,
            onClick: onReplace
        }, busy ? 'Uploading…' : 'Replace image'),
        h('button', {type: 'button', disabled: busy, onClick: onCancel}, 'Cancel')
    ]);
}

function ChatKeySetup({onSaveApiKey}) {
    const save = (input) => {
        if (input.value.trim()) {
            onSaveApiKey(input.value);
            input.value = '';
        }
    };

    return h('div', null, [
        h('p', {className: 'chat-note'},
            'Bring your own OpenAI API key to use the theme assistant. ' +
            'The key is stored only in this browser (localStorage) and sent only to the provider API — never to Ghost.'),
        h('div', {className: 'chat-row'}, [
            h('input', {
                type: 'password',
                placeholder: 'OpenAI API key (sk-…)',
                'aria-label': 'OpenAI API key',
                onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        save(event.currentTarget);
                    }
                }
            }),
            h('button', {
                type: 'button',
                onClick: (event) => {
                    save(event.currentTarget.parentElement.querySelector('input'));
                }
            }, 'Save key')
        ])
    ]);
}

function ChatDrawer({chat, handlers}) {
    if (!chat?.open) {
        return null;
    }

    const send = (input) => {
        const value = input.value.trim();
        if (value && !chat.busy) {
            input.value = '';
            handlers.onSendPrompt(value);
        }
    };

    return h('div', {className: 'chat', role: 'dialog', 'aria-label': 'Theme assistant'}, [
        h('div', {
            className: 'chat-messages',
            // keep the transcript pinned to the latest message
            ref: (node) => {
                if (node) {
                    node.scrollTop = node.scrollHeight;
                }
            }
        }, chat.messages.map((message, index) => h('div', {
            key: index,
            className: `chat-msg ${message.role}`
        }, message.text))),
        chat.busy ? h('div', {className: 'chat-busy', role: 'status'}, 'Working…') : null,
        chat.resultText ? h('div', {className: 'chat-result', role: 'status'}, chat.resultText) : null,
        !chat.hasKey ? h(ChatKeySetup, {onSaveApiKey: handlers.onSaveApiKey}) : h('div', {className: 'chat-row'}, [
            h('input', {
                type: 'text',
                placeholder: 'Ask for a theme change…',
                'aria-label': 'Ask for a theme change',
                disabled: chat.busy,
                onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        send(event.currentTarget);
                    }
                }
            }),
            h('button', {
                type: 'button',
                disabled: chat.busy,
                onClick: (event) => {
                    send(event.currentTarget.parentElement.querySelector('input'));
                }
            }, chat.busy ? 'Working…' : 'Send')
        ]),
        chat.hasKey ? h('div', {className: 'chat-footer'}, [
            h('button', {type: 'button', onClick: handlers.onClearApiKey}, 'Clear API key')
        ]) : null
    ]);
}

function App({state, handlers}) {
    const {themeName, dirtyCount, status, statusText, statusIsError, highlight, editor, imageEditor, publishArmed, chat} = state;
    const busy = status === 'loading' || status === 'publishing';

    let publishLabel = 'Publish';
    if (status === 'publishing') {
        publishLabel = 'Publishing…';
    } else if (publishArmed) {
        publishLabel = 'Confirm publish';
    }

    return h('div', null, [
        h('style', null, STYLES),
        h('div', {className: 'bar', role: 'toolbar', 'aria-label': 'Edit mode'}, [
            h('strong', null, themeName ? `Editing ${themeName}` : 'Edit mode'),
            dirtyCount > 0 ? h('span', {className: 'dirty'}, `${dirtyCount} unpublished edit${dirtyCount === 1 ? '' : 's'}`) : null,
            statusText ? h('span', {
                className: statusIsError || status === 'error' ? 'status error' : 'status',
                role: 'status'
            }, statusText) : null,
            h('button', {
                type: 'button',
                className: 'publish',
                disabled: busy || dirtyCount === 0,
                onClick: handlers.onPublish
            }, publishLabel),
            h('button', {
                type: 'button',
                disabled: status === 'publishing',
                'aria-expanded': Boolean(chat?.open),
                onClick: handlers.onToggleChat
            }, 'Chat'),
            // Exit stays available during boot (a hung theme download must
            // not trap the user in edit mode) — only publishing locks it.
            h('button', {type: 'button', disabled: status === 'publishing', onClick: handlers.onExit}, 'Exit')
        ]),
        h(Highlight, {rect: highlight}),
        h(InlineEditor, {
            editor,
            onCommit: handlers.onCommitEdit,
            onCancel: handlers.onCancelEdit
        }),
        h(ImageEditor, {
            imageEditor,
            busy,
            onReplace: handlers.onReplaceImage,
            onCancel: handlers.onCancelEdit
        }),
        h(ChatDrawer, {chat, handlers})
    ]);
}

/**
 * @param {Object} options
 * @param {Document} [options.doc]
 * @param {{onExit(): void, onPublish(): void, onCommitEdit(value: string): void, onCancelEdit(): void, onReplaceImage(): void, onToggleChat(): void, onSendPrompt(text: string): void, onSaveApiKey(value: string): void, onClearApiKey(): void}} options.handlers
 * @returns {{host: HTMLElement, update(patch: Object): void, getState(): Object, destroy(): void}}
 */
export function createEditModeUi({doc = document, handlers}) {
    const host = doc.createElement('div');
    host.id = OVERLAY_HOST_ID;
    const shadowRoot = host.attachShadow({mode: 'open'});
    doc.body.appendChild(host);

    let state = {
        themeName: null,
        dirtyCount: 0,
        status: 'loading',
        statusText: 'Starting edit mode…',
        statusIsError: false,
        highlight: null,
        editor: null,
        imageEditor: null,
        publishArmed: false,
        chat: {open: false, busy: false, hasKey: false, messages: [], resultText: null}
    };

    function renderApp() {
        render(h(App, {state, handlers}), shadowRoot);
    }

    renderApp();

    return {
        host,
        update(patch) {
            state = {...state, ...patch};
            renderApp();
        },
        getState() {
            return state;
        },
        destroy() {
            render(null, shadowRoot);
            host.remove();
        }
    };
}
