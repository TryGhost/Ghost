import KoenigBehaviourPlugin, {DELETE_CARD_COMMAND, DESELECT_CARD_COMMAND, EDIT_CARD_COMMAND, PASTE_LINK_COMMAND, SELECT_CARD_COMMAND, SHOW_CARD_VISIBILITY_SETTINGS_COMMAND} from '../../src/plugins/KoenigBehaviourPlugin';
import {$createCodeBlockNode, CodeBlockNode} from '@tryghost/kg-default-nodes';
import {$createNodeSelection, $createParagraphNode, $createRangeSelection, $createTextNode, $getRoot, $getSelection, $setSelection, KEY_ARROW_DOWN_COMMAND, KEY_ARROW_LEFT_COMMAND, KEY_ARROW_RIGHT_COMMAND, KEY_ARROW_UP_COMMAND, KEY_ENTER_COMMAND, KEY_TAB_COMMAND, createEditor} from 'lexical';
import {LexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../src/context/KoenigSelectedCardContext', () => ({
    useKoenigSelectedCardContext: () => ({
        selectedCardKey: null,
        setSelectedCardKey: vi.fn(),
        setIsEditingCard: vi.fn(),
        setShowVisibilitySettings: vi.fn()
    })
}));

describe('KoenigBehaviourPlugin missing selections', () => {
    let editor;
    let rootElement;
    let onError;

    beforeEach(() => {
        onError = vi.fn();
        editor = createEditor({onError, nodes: [CodeBlockNode]});
        rootElement = document.createElement('div');
        rootElement.tabIndex = 0;
        document.body.append(rootElement);
        rootElement.focus();
        vi.spyOn(editor, 'getRootElement').mockReturnValue(rootElement);
        render(
            <LexicalComposerContext.Provider value={[editor, {getTheme: () => ({})}]}>
                <KoenigBehaviourPlugin containerElem={{current: rootElement}} cursorDidExitAtTop={vi.fn()} isNested={false} />
            </LexicalComposerContext.Provider>
        );
    });

    afterEach(() => {
        cleanup();
        rootElement.remove();
        vi.restoreAllMocks();
    });

    function dispatch(command, selection, payload = new KeyboardEvent('keydown')) {
        let handled;
        act(() => {
            editor.update(() => {
                $getRoot().append($createParagraphNode().append($createTextNode('Text')));
                $setSelection(selection());
                handled = editor.dispatchCommand(command, payload);
            }, {discrete: true});
        });
        expect(onError).not.toHaveBeenCalled();
        expect(handled).toBe(false);
    }

    it.each([
        ['up', KEY_ARROW_UP_COMMAND],
        ['down', KEY_ARROW_DOWN_COMMAND],
        ['left', KEY_ARROW_LEFT_COMMAND],
        ['right', KEY_ARROW_RIGHT_COMMAND]
    ])('lets Arrow%s fall through for an empty node selection', (_name, command) => {
        dispatch(command, $createNodeSelection);
    });

    it.each([
        ['up', KEY_ARROW_UP_COMMAND],
        ['down', KEY_ARROW_DOWN_COMMAND]
    ])('lets Shift+Arrow%s fall through when focus is on the root', (_name, command) => {
        dispatch(command, () => {
            const selection = $createRangeSelection();
            selection.anchor.set($getRoot().getFirstChild().getKey(), 0, 'element');
            selection.focus.set('root', 1, 'element');
            return selection;
        }, new KeyboardEvent('keydown', {shiftKey: true}));
    });

    it.each([false, true])('lets Tab fall through without a selection (shift: %s)', (shiftKey) => {
        dispatch(KEY_TAB_COMMAND, () => null, new KeyboardEvent('keydown', {shiftKey}));
    });

    it('lets ArrowLeft fall through without a selection', () => {
        dispatch(KEY_ARROW_LEFT_COMMAND, () => null);
    });

    it('lets a programmatic Enter command fall through without a keyboard event', () => {
        dispatch(KEY_ENTER_COMMAND, () => null, null);
    });

    it('ignores deselection of an empty card already removed in the same update', () => {
        act(() => {
            editor.update(() => {
                const paragraph = $createParagraphNode().append($createTextNode('Keep me'));
                const card = $createCodeBlockNode();
                $getRoot().append(card, paragraph);
                card.remove();
                editor.dispatchCommand(DESELECT_CARD_COMMAND, {cardKey: card.getKey()});
                expect($getRoot().getChildren()).toEqual([paragraph]);
            }, {discrete: true});
        });
        expect(onError).not.toHaveBeenCalled();
    });

    it.each([() => null, $createNodeSelection])('ignores link insertion without a range selection', (selection) => {
        dispatch(PASTE_LINK_COMMAND, selection, {linkMatch: ['https://example.com', 'https://example.com']});
    });

    it('lets ArrowDown fall through when the native selection has no range', () => {
        window.getSelection().removeAllRanges();
        dispatch(KEY_ARROW_DOWN_COMMAND, () => {
            const selection = $createRangeSelection();
            const key = $getRoot().getFirstChild().getFirstChild().getKey();
            selection.anchor.set(key, 1, 'text');
            selection.focus.set(key, 1, 'text');
            return selection;
        });
    });

    it('selects the card below an empty paragraph when the native selection has no range', () => {
        window.getSelection().removeAllRanges();
        let handled;
        act(() => {
            editor.update(() => {
                const card = $createCodeBlockNode();
                $getRoot().append($createParagraphNode(), card);
                $getRoot().getFirstChild().select(0, 0);
                handled = editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, new KeyboardEvent('keydown'));
                expect($getSelection().getNodes()).toEqual([card]);
            }, {discrete: true});
        });
        expect(onError).not.toHaveBeenCalled();
        expect(handled).toBe(true);
    });

    it('blocks deletion immediately when the editor becomes read-only', () => {
        let cardKey;
        let handled;
        act(() => {
            editor.update(() => {
                const card = $createCodeBlockNode({code: 'Saved code'});
                cardKey = card.getKey();
                $getRoot().append(card);
            }, {discrete: true});

            editor.setEditable(false);
            handled = editor.dispatchCommand(DELETE_CARD_COMMAND, {cardKey});
        });

        expect(onError).not.toHaveBeenCalled();
        expect(handled).toBe(false);
        editor.getEditorState().read(() => {
            expect($getRoot().getFirstChild().getKey()).toBe(cardKey);
        });
    });

    it('disables card commands while read-only and restores them when editing resumes', () => {
        let cardKey;
        act(() => {
            editor.update(() => {
                const card = $createCodeBlockNode({code: 'Saved code'});
                cardKey = card.getKey();
                $getRoot().append(card);
            }, {discrete: true});
            editor.setEditable(false);
        });

        act(() => {
            editor.update(() => {
                for (const command of [SELECT_CARD_COMMAND, EDIT_CARD_COMMAND, DELETE_CARD_COMMAND, SHOW_CARD_VISIBILITY_SETTINGS_COMMAND]) {
                    expect(editor.dispatchCommand(command, {cardKey})).toBe(false);
                }
                expect($getSelection()).toBeNull();
                expect($getRoot().getFirstChild().getKey()).toBe(cardKey);
            }, {discrete: true});
        });

        act(() => editor.setEditable(true));
        act(() => {
            editor.update(() => {
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey});
                expect($getSelection().getNodes().map(node => node.getKey())).toEqual([cardKey]);
            }, {discrete: true});
        });
        expect(onError).not.toHaveBeenCalled();
    });
});
