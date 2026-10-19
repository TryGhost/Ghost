import KoenigNestedEditorPlugin from '../../src/plugins/KoenigNestedEditorPlugin';
import {KEY_ENTER_COMMAND, createEditor} from 'lexical';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const context = vi.hoisted(() => ({editor: null}));
vi.mock('@lexical/react/LexicalComposerContext.js', () => ({useLexicalComposerContext: () => [context.editor]}));

describe('KoenigNestedEditorPlugin', () => {
    afterEach(() => {
        cleanup();
    });

    it.each([false, true])('lets a programmatic Enter command fall through without a keyboard event (defaultKoenigEnterBehaviour: %s)', (defaultKoenigEnterBehaviour) => {
        const onError = vi.fn();
        const editor = createEditor({onError});
        context.editor = editor;
        render(<KoenigNestedEditorPlugin defaultKoenigEnterBehaviour={defaultKoenigEnterBehaviour} />);

        let handled;
        act(() => {
            editor.update(() => {
                handled = editor.dispatchCommand(KEY_ENTER_COMMAND, null);
            }, {discrete: true});
        });

        expect(onError).not.toHaveBeenCalled();
        expect(handled).toBe(false);
    });
});
