import HtmlOutputPlugin from '../../src/plugins/HtmlOutputPlugin';
import {$getRoot, $getSelection, type LexicalEditor} from 'lexical';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function Capture({onEditor}: {onEditor: (editor: LexicalEditor) => void}) {
    const [editor] = useLexicalComposerContext();
    onEditor(editor);
    return null;
}

describe('HtmlOutputPlugin', () => {
    afterEach(() => {
        cleanup();
    });

    it('loads its initial HTML without leaving a selection, which would focus the editor', async () => {
        let editor: LexicalEditor | undefined;
        await act(async () => {
            render(
                <LexicalComposer initialConfig={{namespace: 'test', onError: (error: Error) => {
                    throw error;
                }}}>
                    <Capture onEditor={(captured) => {
                        editor = captured;
                    }} />
                    <HtmlOutputPlugin html="<p>A caption</p>" setHtml={vi.fn()} />
                </LexicalComposer>
            );
        });

        const loaded = editor!.getEditorState().read(() => ({
            text: $getRoot().getTextContent(),
            selection: $getSelection()
        }));
        expect(loaded.text).toBe('A caption');
        expect(loaded.selection).toBeNull();
    });
});
