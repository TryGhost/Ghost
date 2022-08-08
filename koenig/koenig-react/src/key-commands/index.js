import Browser from '../utils/browser';
import {CURSOR_BEFORE, CURSOR_AFTER} from '../utils/constants';

export const DEFAULT_KEY_COMMANDS = [{
    str: 'ENTER',
    run(editor, koenig) {
        const {isCollapsed, head: {offset, section}} = editor.range;

        // if cursor is at beginning of a heading, insert a blank paragraph above
        if (isCollapsed && offset === 0 && section.tagName && section.tagName.match(/^h\d$/)) {
            editor.run((postEditor) => {
                let newPara = postEditor.builder.createMarkupSection('p');
                let collection = section.parent.sections;
                postEditor.insertSectionBefore(collection, newPara, section);
            });
            koenig.scrollCursorIntoView();
            return;
        }

        // if cursor is on a blank list item mid-list then split the list
        if (isCollapsed && section.isBlank && section.isListItem && section.next && section.next.isListItem) {
            editor.run((postEditor) => {
                postEditor.toggleSection('p', section.headPosition());
            });
            koenig.scrollCursorIntoView();
            return;
        }

        // if a card is selected, move the cursor to the end of the card so that
        // Enter consistently adds a new paragraph after the card
        if (isCollapsed && section.isCardSection) {
            koenig.moveCaretToTailOfSection(section, true);
        }

        return false;
    }
}, {
    // CMD+ENTER is our keyboard shortcut for putting a selected card into edit mode
    str: 'META+ENTER',
    run(editor, koenig) {
        if (koenig.selectedCard) {
            koenig.editCard(koenig.selectedCard);
            return;
        }

        return false;
    }
}, {
    // CTRL+ENTER is our keyboard shortcut for putting a selected card into edit mode
    str: 'CTRL+ENTER',
    run(editor, koenig) {
        if (Browser.isWin() && koenig.selectedCard) {
            koenig.editCard(koenig.selectedCard);
            return;
        }

        return false;
    }
}, {
    str: 'SHIFT+ENTER',
    run(editor) {
        if (!editor.range.headSection.isMarkerable) {
            return;
        }

        editor.run((postEditor) => {
            const softReturn = postEditor.builder.createAtom('soft-return');
            postEditor.insertMarkers(editor.range.head, [softReturn]);
        });
    }
}, {
    str: 'BACKSPACE',
    run(editor, koenig) {
        const {head, isCollapsed, head: {marker, offset, section}} = editor.range;
        const {next, prev} = section;

        // if a card is selected we should delete the card then place the cursor
        // at the end of the previous section
        if (koenig.selectedCard) {
            const cursorPosition = section.prev ? CURSOR_BEFORE : CURSOR_AFTER;
            koenig.deleteCard(koenig.selectedCard, cursorPosition);
            return;
        }

        // if the cursor is at the beginning of the doc and on a blank paragraph,
        // then delete or re-create the paragraph to remove formatting
        const sections = section.isListItem ? section.parent.parent.sections : section.parent.sections;
        const isFirstSection = section === sections.head;
        if (isFirstSection && isCollapsed && offset === 0 && (section.isBlank || section.text === '')) {
            editor.run((postEditor) => {
                // remove the current section
                postEditor.removeSection(section);

                // select the next section
                if (next) {
                    return;
                }

                // we don't have another section so create a blank paragraph
                // which will have the effect of removing any formatting
                const {builder} = postEditor;
                const p = builder.createMarkupSection('p');
                postEditor.insertSectionAtEnd(p);
                postEditor.setRange(p.tailPosition());
            });

            // allow default behaviour which will trigger `cursorDidChange` and
            // fire our `cursorDidExitAtTop` action
            return;
        }

        // if the section about to be deleted by a backspace is a card then
        // actually delete the card rather than selecting it.
        // However, if the current paragraph is blank then delete the paragraph
        // instead - allows blank paragraphs between cards to be deleted and
        // feels more natural
        if (isCollapsed && offset === 0 && prev && prev.type === 'card-section' && !section.isBlank) {
            const card = koenig.getCardFromSection(prev);
            koenig.deleteCard(card);
            return;
        }

        // if cursor is at the beginning of a heading and previous section is a
        // blank paragraph, delete the blank paragraph
        if (isCollapsed && offset === 0 && section.tagName.match(/^h\d$/) && prev && prev.tagName === 'p' && prev.isBlank) {
            editor.run((postEditor) => {
                postEditor.removeSection(prev);
            });
            return;
        }

        // if the markup about to be deleted is a special format (code, strike)
        // then undo the text expansion to allow it to be extended
        if (isCollapsed && marker && offset !== 0) {
            const specialMarkupTagNames = Object.keys(koenig.SPECIAL_MARKUPS);
            let hasReversed = false;
            specialMarkupTagNames.forEach((tagName) => {
                // only continue if we're about to delete a special markup
                const markup = marker.markups.find(markerMarkup => markerMarkup.tagName.toUpperCase() === tagName);
                if (markup) {
                    const nextMarker = head.markerIn(1);
                    // ensure we're at the end of the markup not inside it
                    if (!nextMarker || !nextMarker.hasMarkup(tagName)) {
                        // wrap with the text expansion, remove formatting, then delete the last char
                        editor.run((postEditor) => {
                            let markdown = koenig.SPECIAL_MARKUPS[tagName];
                            let replace = true;

                            if (typeof markdown === 'object') {
                                replace = markdown.replace;
                                markdown = markdown.char;
                            }

                            let range = editor.range.expandByMarker(markerToExpand => !!markerToExpand.markups.includes(markup));

                            // replaced markdown (default) will have chars removed when formatted
                            // and added back when the format is removed by backspace
                            if (replace) {
                                postEditor.insertText(range.head, markdown);
                                range = range.extend(markdown.length);
                                let endPos = postEditor.insertText(range.tail, markdown);
                                range = range.extend(markdown.length);
                                postEditor.toggleMarkup(tagName, range);
                                endPos = postEditor.deleteAtPosition(endPos, -1);
                                postEditor.setRange(endPos);
                            } else {
                                postEditor.toggleMarkup(tagName, range);
                                const endPos = postEditor.deleteAtPosition(range.tail);
                                postEditor.setRange(endPos);
                            }
                        });
                        hasReversed = true;
                    }
                }
            });
            if (hasReversed) {
                return;
            }
        }

        return false;
    }
}, {
    str: 'DEL',
    run(editor, koenig) {
        const {isCollapsed, head: {offset, section}} = editor.range;

        // if a card is selected we should delete the card then place the cursor
        // at the beginning of the next section or select the following card
        if (koenig.selectedCard) {
            const selectNextCard = section.next?.type === 'card-section';
            const nextCard = koenig.getCardFromSection(section.next);

            koenig.deleteCard(koenig.selectedCard);

            if (selectNextCard) {
                koenig.selectCard(nextCard);
            }
            return;
        }

        // if the section about to be deleted by a DEL is a card then actually
        // delete the card rather than selecting it
        // However, if the current paragraph is blank then delete the paragraph
        // instead - allows blank paragraphs between cards to be deleted and
        // feels more natural
        if (isCollapsed && offset === section.length && section.next && section.next.type === 'card-section' && !section.isBlank) {
            const card = koenig.getCardFromSection(section.next);
            koenig.deleteCard(card, CURSOR_BEFORE);
            return;
        }

        return false;
    }
}, {
    // trigger a closure action to indicate that the caret "left" the top of
    // the editor canvas when pressing UP with the caret at the beginning of
    // the doc
    str: 'UP',
    run(editor, koenig) {
        const {isCollapsed, head: {offset, section}} = editor.range;
        const prevSection = section.isListItem && !section.prev ? section.parent.prev : section.prev;

        if (isCollapsed && (offset === 0 || section.isCardSection) && !prevSection) {
            koenig.exitCursorAtTop();
            return false;
        }

        // Firefox has a bug with cursor movement where it will stop the cursor
        // from moving upwards when a card is selected. Default behaviour in
        // all other browsers is to place the cursor at the end of the previous
        // section so we replicate that here
        if (section.isCardSection && prevSection) {
            koenig.moveCaretToTailOfSection(prevSection, false);
            return;
        }

        return false;
    }
}, {
    str: 'LEFT',
    run(editor, koenig) {
        const {isCollapsed, head: {offset, section}} = editor.range;

        // trigger a closure action to indicate that the caret "left" the top of
        // the editor canvas if the caret is at the very beginning of the doc
        const prevSection = section.isListItem && !section.prev ? section.parent.prev : section.prev;
        if (isCollapsed && (offset === 0 || section.isCardSection) && !prevSection) {
            koenig.exitCursorAtTop();
            return;
        }

        // if we have a selected card move the caret to end of the previous
        // section because the cursor will likely be at the end of the card
        // section meaning the default behaviour would move the cursor to the
        // beginning and require two key presses instead of one
        if (koenig.selectedCard && koenig.selectedCard.postModel === section) {
            koenig.moveCaretToTailOfSection(section.prev, false);
            return;
        }

        return false;
    }
}];

export default DEFAULT_KEY_COMMANDS;
