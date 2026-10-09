import {$createListItemNode, $createListNode, ListItemNode, ListNode} from '@lexical/list';
import {$createParagraphNode, $createRangeSelection, $createTextNode, $getRoot, $setSelection} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';

// Regression coverage for Sentry ADMIN-19Q6 (Lexical error #68).
// Browser selections can end between a list and the following card/empty paragraph.
describe('list boundary selections', () => {
    it.each([false, true])('selects a list without including the following paragraph (backward: %s)', (backward) => {
        const editor = createHeadlessEditor({
            nodes: [ListNode, ListItemNode],
            onError(error) {
                throw error;
            }
        });

        editor.update(() => {
            const root = $getRoot();
            const text = $createTextNode('Selected text');
            const item = $createListItemNode().append(text);
            const list = $createListNode('bullet').append(item);
            root.append(list, $createParagraphNode());

            const selection = $createRangeSelection();
            const start = backward ? selection.focus : selection.anchor;
            const end = backward ? selection.anchor : selection.focus;
            start.set(text.getKey(), 0, 'text');
            end.set(root.getKey(), 1, 'element');

            expect(selection.getNodes()).toEqual([text, item, list]);
            expect(selection.getTextContent()).toBe('Selected text\n');

            $setSelection(selection);
            selection.insertText('Replacement');
            expect(list.getTextContent()).toBe('Replacement');
            expect(root.getChildren()).toHaveLength(2);
        }, {discrete: true});
    });
});

describe('nested list boundary selections', () => {
    it('stops at the outer list after visiting the remaining nested items', () => {
        const editor = createHeadlessEditor({
            nodes: [ListNode, ListItemNode],
            onError(error) {
                throw error;
            }
        });

        editor.update(() => {
            const root = $getRoot();
            const firstText = $createTextNode('First');
            const secondText = $createTextNode('Second');
            const firstItem = $createListItemNode().append(firstText);
            const secondItem = $createListItemNode().append(secondText);
            const nestedList = $createListNode('bullet').append(firstItem, secondItem);
            const outerItem = $createListItemNode().append(nestedList);
            const list = $createListNode('bullet').append(outerItem);
            root.append(list, $createParagraphNode());

            const selection = $createRangeSelection();
            selection.anchor.set(firstText.getKey(), 0, 'text');
            selection.focus.set(root.getKey(), 1, 'element');

            expect(selection.getNodes()).toEqual([
                firstText, firstItem, secondItem, secondText, nestedList, outerItem, list
            ]);
            expect(selection.getTextContent()).toBe('First\nSecond\n');

            $setSelection(selection);
            selection.insertText('Replacement');
            expect(list.getTextContent()).toBe('Replacement');
            expect(root.getChildren()).toHaveLength(2);
        }, {discrete: true});
    });
});
