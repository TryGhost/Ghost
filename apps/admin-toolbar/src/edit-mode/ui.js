/**
 * Edit-mode chunk UI — minimal Preact, rendered into its OWN shadow root
 * (host: #ghost-admin-toolbar-edit-overlay) so theme CSS can't bleed in and
 * the overlay survives every document swap (the swapper preserves the host).
 *
 * Three pieces, all driven by a plain state object via `update(patch)`:
 * - the edit-mode bar (theme name, dirty count, publish, exit, status line);
 * - the hover highlight (an outline overlay positioned from the hovered
 *   element's bounding rect — NOT shadow-DOM-bound, it just draws on top);
 * - the inline text editor (a small floating input over the clicked element;
 *   Enter commits, Escape cancels — deliberately spike-simple).
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

function App({state, handlers}) {
    const {themeName, dirtyCount, status, statusText, statusIsError, highlight, editor} = state;
    const busy = status === 'loading' || status === 'publishing';

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
            }, status === 'publishing' ? 'Publishing…' : 'Publish'),
            // Exit stays available during boot (a hung theme download must
            // not trap the user in edit mode) — only publishing locks it.
            h('button', {type: 'button', disabled: status === 'publishing', onClick: handlers.onExit}, 'Exit')
        ]),
        h(Highlight, {rect: highlight}),
        h(InlineEditor, {
            editor,
            onCommit: handlers.onCommitEdit,
            onCancel: handlers.onCancelEdit
        })
    ]);
}

/**
 * @param {Object} options
 * @param {Document} [options.doc]
 * @param {{onExit(): void, onPublish(): void, onCommitEdit(value: string): void, onCancelEdit(): void}} options.handlers
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
        editor: null
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
