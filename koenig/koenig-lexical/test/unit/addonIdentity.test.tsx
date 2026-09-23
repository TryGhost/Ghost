import {$createAddonNode, AddonNode} from '../../src/nodes/AddonNode';
import {$getRoot, REDO_COMMAND, UNDO_COMMAND, createEditor} from 'lexical';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {act, render} from '@testing-library/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

it('gives a pasted copy a new identity while preserving the original', () => {
    const editor = createEditor({nodes: [AddonNode], onError(error) { throw error; }});
    editor.update(() => {
        const original = $createAddonNode({id: 'original-card', addonHandle: 'podcast', blockName: 'episode', props: {title: 'Episode'}});
        $getRoot().append(original);
        const pasted = AddonNode.importJSON(original.exportJSON());
        original.insertBefore(pasted);
        expect(original.id).toBe('original-card');
        expect(pasted.id).toBeTruthy();
        expect(pasted.id).not.toBe(original.id);
        expect(pasted.props).toEqual(original.props);
    }, {discrete: true});
});

it('retains identity across loading, editing and a cut-and-paste move', () => {
    const editor = createEditor({nodes: [AddonNode], onError(error) { throw error; }});
    const state = editor.parseEditorState(JSON.stringify({root: {type: 'root', version: 1, children: [{type: 'addon', version: 1, id: 'saved-card', addonHandle: 'podcast', blockName: 'episode', props: {title: null}}]}}));
    editor.setEditorState(state);
    editor.update(() => {
        const original = $getRoot().getFirstChild() as AddonNode;
        expect(original.id).toBe('saved-card');
        original.props = {title: 'Edited'};
        const serialized = original.exportJSON();
        original.remove();
        const moved = AddonNode.importJSON(serialized);
        $getRoot().append(moved);
        expect(moved.id).toBe('saved-card');
        expect(moved.props).toEqual({title: 'Edited'});
    }, {discrete: true});
});


it('restores the same distinct identities through undo and redo', async () => {
    let editor;
    function Harness() {
        [editor] = useLexicalComposerContext();
        return null;
    }
    const {unmount} = render(<LexicalComposer initialConfig={{namespace: 'identity', nodes: [AddonNode], onError(error) { throw error; }}}><HistoryPlugin /><Harness /></LexicalComposer>);
    editor.update(() => {
        $getRoot().clear().append($createAddonNode({id: 'original-card'}));
    }, {discrete: true, tag: 'history-push'});
    let copyId;
    editor.update(() => {
        const original = $getRoot().getFirstChild() as AddonNode;
        const copy = AddonNode.importJSON(original.exportJSON());
        copyId = copy.id;
        $getRoot().append(copy);
    }, {discrete: true, tag: 'history-push'});
    await act(async () => { editor.dispatchCommand(UNDO_COMMAND, undefined); });
    expect(editor.getEditorState().toJSON().root.children.map(node => node.id)).toEqual(['original-card']);
    await act(async () => { editor.dispatchCommand(REDO_COMMAND, undefined); });
    expect(editor.getEditorState().toJSON().root.children.map(node => node.id)).toEqual(['original-card', copyId]);
    unmount();
});
