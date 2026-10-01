import HtmlOutputPlugin from '../../src/plugins/HtmlOutputPlugin';
import {$getRoot, $getSelection, createEditor} from 'lexical';
import {LexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';

afterEach(cleanup);

it('loads existing HTML without selecting it or moving focus into the editor', async () => {
    const editor = createEditor({onError: error => { throw error; }});
    const input = document.createElement('input');
    const root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(input, root);
    editor.setRootElement(root);
    input.focus();

    try {
        await act(async () => {
            render(
                <LexicalComposerContext.Provider value={[editor, {getTheme: () => ({})}]}>
                    <HtmlOutputPlugin html="<p>A saved caption</p>" setHtml={vi.fn()} />
                </LexicalComposerContext.Provider>
            );
        });

        editor.getEditorState().read(() => {
            expect($getRoot().getTextContent()).toBe('A saved caption');
            expect($getSelection()).toBeNull();
        });
        expect(document.activeElement).toBe(input);
    } finally {
        editor.setRootElement(null);
        input.remove();
        root.remove();
    }
});
