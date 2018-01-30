import $ from 'jquery';
import RSVP from 'rsvp';

// searches through the editor to see if it can find the current card
// as selected in the DOM.
export function getCardFromDoc(cardId, editor) {
    return new RSVP.Promise((resolve, reject) => {
        if (!cardId || !editor || !editor.post || !editor.post.sections) {
            return reject();
        }
        editor.post.sections.forEach((section) => {
            let sectionDom = $(section.renderNode.element);
            if (section.isCardSection && sectionDom.find(`#${cardId}`).length) {
                return resolve(section);
            }
        });
        return reject();
    });
}

// takes two jquery objects, the target of a click event and a cardholder
// and sees if the click event should close an open card or not
export function checkIfClickEventShouldCloseCard(target, cardHolder) {
    // see if this element or one of its ancestors is a card.
    let card = target.hasClass('kg-card') ? target : target.parents('.kg-card');

    let isCardToggle = target.hasClass('kg-card-button') || target.parents('.gh-cardmenu').length || target.parents('.kg-card-toolbar').length;

    // if we're selecting a card toggle (menu item) OR we have clicked on a card and the card is the one we expect//
    // then we shouldn't close the menu and return false.
    if (isCardToggle || (card.length && card[0] === cardHolder[0])) {
        return false;
    }
    return true;
}

// get a position in the editor based on the range.
// in Chrome, Firefox, and Edge range.getBoundingClientRect() works
// in Safari if the range is collapsed you get nothing so we expand the range by 1
// if that doesn't work then we fallback got the paragraph.
export function getPositionFromRange(editor, holder, range) {
    let position = getPositionOnScreenFromRange(editor, holder, range);
    let scrollLeft = holder.scrollLeft();
    let scrollTop = holder.scrollTop();
    return {
        left: position.left + scrollLeft,
        right: position.right + scrollLeft,
        top: position.top + scrollTop,
        bottom: position.bottom + scrollTop,
        width: position.width,
        height: position.height
    };
}

// get a position on the screen based on the range.
export function getPositionOnScreenFromRange(editor, holder, range) {
    if (!editor.range || !editor.range.head || !editor.range.head.section) {
        return;
    }
    let position;
    let offset = holder.offset();
    let selection = window.getSelection();

    if (!range && selection.rangeCount) {
        range = selection.getRangeAt(0);
    }

    if (range) {
        if (range.getBoundingClientRect) {
            let rect = range.getBoundingClientRect();
            position = {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
        }

        // if getBoundingClientRect doesn't work then create it from the client rects
        if ((!position || (position.left === 0 && position.top === 0)) && range.getClientRects) {
            let rects = range.getClientRects();

            for (let i = 0; i < rects.length; i += 1) {
                let rect = rects[i];
                if (position.left === 0 || position.left > rect.left) {
                    position.left = rect.left;
                }
                if (position.top === 0 || position.top > rect.top) {
                    position.top = rect.top;
                }
                if (position.right < rect.right) {
                    position.right = rect.right;
                }
                if (position.bottom < rect.bottom) {
                    position.bototm = rect.bottom;
                }
            }
        }
    }

    // if we can't get the position from either getBoundingClientRect or getClientRects then get it based on the paragraph.
    if (!position || (position && position.left === 0 && position.top === 0)) {
        let rect = editor.range.head.section.renderNode.element.getBoundingClientRect();
        position = {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
    }

    return {
        left: position.left - offset.left,
        right: position.right - offset.left,
        top: position.top - offset.top,
        bottom: position.bottom - offset.top,
        width: position.right - position.left,
        height: position.bottom - position.top
    };
}
