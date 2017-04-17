import RSVP from 'rsvp';
import $ from 'jquery';

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

// get a position based on the range.
// in Chrome, Firefox, and Edge range.getBoundingClientRect() works
// in Safari if the range is collapsed you get nothing so we expand the range by 1
// if that doesn't work then we fallback got the paragraph.
// export function getPositionFromRange(editor, range = window.getSelection().getRangeAt(0)) {
//     let {top, left} = editor.element.getBoundingClientRect();
//     let position = range.getBoundingClientRect();

//     if (position.left === 0 && position.top === 0) {
//         // in safari if the range is collapsed you can't get it's location.
//         // this is a bug as it's against the spec.
//         position = getCursorPositionSafari(range);
//         // position = editor.range.head.section.renderNode.element.getBoundingClientRect();
//     }
// }

// function getCursorPositionSafari(range) {
//     if(offset < container.length) {

//     } else {

//     }
// }