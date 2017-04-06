import Component from 'ember-component';
import {A as emberA} from 'ember-array/utils';
import run from 'ember-runloop';
import layout from '../templates/components/gh-koenig';
import Mobiledoc from 'mobiledoc-kit';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import createCardFactory from '../lib/card-factory';
import defaultCommands from '../options/default-commands';
import editorCards  from '../cards/index';
import $ from 'jquery';
// import { VALID_MARKUP_SECTION_TAGNAMES } from 'mobiledoc-kit/models/markup-section'; //the block elements supported by mobile-doc

export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    atoms: [],
    markups: [],
    cards: [],
    sections: []
};

export default Component.extend({
    layout,
    classNames: ['editor-holder'],
    emberCards: emberA([]),
    selectedCard: null,
    editedCard: null,
    keyDownHandler: [],
    init() {
        this._super(...arguments);

        let mobiledoc = this.get('value') || BLANK_DOC;
        let userCards = this.get('cards') || [];

        if (typeof mobiledoc === 'string') {
            mobiledoc = JSON.parse(mobiledoc);
        }

        // if the doc is cached then the editor is loaded and we don't need to continue.
        if (this._cachedDoc && this._cachedDoc === mobiledoc) {
            return;
        }

        let createCard = createCardFactory.apply(this, {}); // need to pass the toolbar

        let options = {
            mobiledoc,
            // temp
            cards: createCard(editorCards.concat(userCards)),
            atoms: [{
                name: 'soft-return',
                type: 'dom',
                render() {
                    return document.createElement('br');
                }
            }],
            spellcheck: true,
            autofocus: this.get('shouldFocusEditor'),
            placeholder: 'Click here to start ...',
            unknownCardHandler: () => {
                // todo
            }
        };

        this.editor = new Mobiledoc.Editor(options);
    },

    willRender() {
        if (this._rendered) {
            return;
        }
        let {editor} = this;

        editor.didRender(() => {

            this.sendAction('loaded', editor);
        });
        editor.postDidChange(()=> {
            run.join(() => {
                // store a cache of the local doc so that we don't need to reinitialise it.
                this._cachedDoc = editor.serialize(MOBILEDOC_VERSION);
                this.sendAction('onChange', this._cachedDoc);
                if (this._cachedDoc !== BLANK_DOC && !this._firstChange) {
                    this._firstChange = true;
                    this.sendAction('onFirstChange', this._cachedDoc);
                }
            });
        });
    },

    didRender() {
        if (this._rendered) {
            return;
        }
        let [editorDom] = this.$('.surface');
        this.domContainer = editorDom.parentNode.parentNode.parentNode.parentNode; // nasty nasty nasty.
        this.editor.render(editorDom);
        this._rendered = true;

        window.editor = this.editor;
        defaultCommands(this.editor); // initialise the custom text handlers for MD, etc.
        // shouldFocusEditor is only true when transitioning from new to edit, otherwise it's false or undefined.
        // therefore, if it's true it's after the first lot of content is entered and we expect the caret to be at the
        // end of the document.
        if (this.get('shouldFocusEditor')) {
            let range = document.createRange();
            range.selectNodeContents(this.editor.element);
            range.collapse(false);
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            this.editor._ensureFocus();
        }

        this.editor.cursorDidChange(() => this.cursorMoved());

        // hack to track key up to focus back on the title when the up key is pressed
        this.editor.element.addEventListener('keydown', (event) => {
            if (event.keyCode === 38) { // up arrow
                let selection = window.getSelection();
                if (!selection.rangeCount) {
                    return;
                }
                let range = selection.getRangeAt(0); // get the actual range within the DOM.
                let cursorPositionOnScreen = range.getBoundingClientRect();
                let topOfEditor = this.editor.element.getBoundingClientRect().top;
                if (cursorPositionOnScreen.top < topOfEditor + 33) {
                    let $title = $(this.titleQuery);

                    // // the code below will move the cursor to the correct part of the title when pressing the ⬆ arrow.
                    // // unfortunately it positions correctly in Firefox but you cannot edit, it doesn't position correctly in Chrome but you can.
                    // let offset = findCursorPositionFromPixel($title[0].firstChild,  cursorPositionOnScreen.left);

                    // let newRange = document.createRange();
                    // newRange.collapse(true);
                    // newRange.setStart($title[0].firstChild, offset);
                    // newRange.setEnd($title[0].firstChild, offset);
                    // updateCursor(newRange);

                    $title[0].focus();

                    return false;
                }
            }
        });

        // listen to keydown events outside of the editor, used to handle keydown events in the cards.
        document.onkeydown = (event) => {
            // if any of the keydown handlers return false then we return false therefore stopping the event from propogating.
            return this.get('keyDownHandler').reduce((returnType, handler) => {
                let result = handler(event);
                if (returnType !== false) {
                    return result;
                }
                return returnType;
            }, true);
        };

    },

    // drag and drop images onto the editor
    drop(event) {
        if (event.dataTransfer.files.length) {
            event.preventDefault();
            for (let i = 0; i < event.dataTransfer.files.length; i++) {
                let file = [event.dataTransfer.files[i]];
                this.editor.insertCard('card-image', {pos: 'top', file});
            }
        }
    },

    // makes sure the cursor is on screen except when selection is happening in which case the browser mostly ensures it.
    // there is an issue with keyboard selection on some browsers though so the next step will be to record mouse and touch events.
    cursorMoved() {
        let editor = this.get('editor');

        if (editor.range.isCollapsed) {
            let scrollBuffer = 33; // the extra buffer to scroll.
            let selection = window.getSelection();
            if (!selection.rangeCount) {
                return;
            }
            let range = selection.getRangeAt(0); // get the actual range within the DOM.
            let position =  range.getBoundingClientRect();
            let windowHeight = window.innerHeight;

            if (position.bottom > windowHeight) {
                this.domContainer.scrollTop += position.bottom - windowHeight + scrollBuffer;
            } else if (position.top < 0) {
                this.domContainer.scrollTop += position.top - scrollBuffer;
            }

            if (editor.range && editor.range.headSection && editor.range.headSection.isCardSection) {
                let id = $(editor.range.headSection.renderNode.element).find('.kg-card > div').attr('id');
                // let id = card.find('div').attr('id');
                window.getSelection().removeAllRanges();
                this.send('selectCardHard', id);
            } else {
                this.send('deselectCard');
            }
        } else {
            this.send('deselectCard');
        }
    },

    willDestroy() {
        this.editor.destroy();
        this.send('deselectCard');
        document.onkeydown = null;
    },

    actions: {
        // thin border, shows that a card is selected but the user cannot delete the card with
        // keyboard events.
        // used when the content of the card is selected and it is editing.
        selectCard(cardId) {
            let card = this.get('emberCards').find((card) => card.id === cardId);
            let cardHolder = $(`#${cardId}`).parent('.kg-card');
            if (this.get('selectedCard') !== card) {
                this.send('deselectCard');
            }
            cardHolder.addClass('selected');
            cardHolder.removeClass('selected-hard');
            this.set('selectedCard', card);
            this.get('keyDownHandler').length = 0;
            // cardHolder.focus();
            document.onclick = (event) => {
                let target = $(event.target);
                let parent = target.parents('.kg-card');
                if (!target.hasClass('kg-card') && !target.hasClass('kg-card-button') && !target.hasClass('kg-card-button-text') && (!parent.length || parent[0] !== cardHolder[0])) {
                    this.send('deselectCard');
                }
            };
        },
        // thicker border and with keyboard events for moving around the editor
        // creating blocks under the card and deleting the card.
        // used when selecting the card with the keyboard or clicking on the toolbar.
        selectCardHard(cardId) {
            let card = this.get('emberCards').find((card) => card.id === cardId);
            let cardHolder = $(`#${cardId}`).parents('.kg-card');
            if (this.get('selectedCard') !== card) {
                this.send('deselectCard');
            }
            cardHolder.addClass('selected');
            cardHolder.addClass('selected-hard');
            this.set('selectedCard', card);

            document.onclick = (event) => {
                let target = $(event.target);
                let parent = target.parents('.kg-card');

                if (!target.hasClass('kg-card') && !target.hasClass('kg-card-button') && !target.hasClass('kg-card-button-text') && (!parent.length || parent[0] !== cardHolder[0])) {
                    this.send('deselectCard');
                }
            };

            let keyDownHandler = this.get('keyDownHandler');
            keyDownHandler.push((event) => {
                let editor = this.get('editor');
                switch (event.keyCode) {
                case 37: // arrow left
                case 38: // arrow up
                    editor.post.sections.forEach((section) => {
                        let currentCard = $(section.renderNode.element);
                        if (currentCard.find(`#${cardId}`).length) {
                            if (section.prev) {
                                let range = section.prev.toRange();
                                range.tail.offset = 0;
                                editor.selectRange(range);
                                return;
                            } else {
                                $(this.titleQuery).focus();
                            }
                        }
                    });
                    return false;
                case 39: // arrow right
                case 40: // arrow down
                    editor.post.sections.forEach((section) => {
                        let currentCard = $(section.renderNode.element);
                        if (currentCard.find(`#${cardId}`).length) {
                            if (section.next) {
                                let range = section.next.toRange();
                                range.tail.offset = 0;
                                editor.selectRange(range);
                                return;
                            }
                        }
                    });
                    return false;
                case 13: // enter
                    editor.post.sections.forEach((section) => {
                        let currentCard = $(section.renderNode.element);
                        if (currentCard.find(`#${cardId}`).length) {
                            if (section.next) {
                                editor.run((postEditor) => {
                                    let newSection = editor.builder.createMarkupSection('p');
                                    postEditor.insertSectionBefore(editor.post.sections, newSection, section.next);
                                    postEditor.setRange(newSection.toRange()); // new Mobiledoc.Range(newSection.headPosition)
                                });
                                return;
                            } else {
                                editor.run((postEditor) => {
                                    let newSection = editor.builder.createMarkupSection('p');
                                    postEditor.insertSectionAtEnd(newSection);
                                    postEditor.setRange(newSection.toRange());
                                });

                            }
                        }
                    });

                    return false;
                case 27: // escape
                    this.send('selectCard', cardId);
                    return false;
                case 8: // backspace
                case 46: // delete
                    card.env.remove();
                    return false;
                }
            });
        },
        deselectCard() {
            let selectedCard = this.get('selectedCard');
            if (selectedCard) {
                let cardHolder = $(`#${selectedCard.id}`).parent('.kg-card');
                cardHolder.removeClass('selected');
                cardHolder.removeClass('selected-hard');
                this.set('selectedCard', null);
            }
            this.get('keyDownHandler').length = 0;
            document.onclick = null;

            this.set('editedCard', null);
        },
        editCard(cardId) {
          //  this.send('selectCard', cardId);
            let card = this.get('emberCards').find((card) => card.id === cardId);
            this.set('editedCard', card);
        },
        stopEditingCard() {
            this.set('editedCard', null);
        }
    }

});

// // code for moving the cursor into the correct position of the title: (is buggy)

// // find the cursor position based on a pixel offset of an element.
// // used to move the cursor vertically into the title.
// function findCursorPositionFromPixel(el, horizontal_offset) {
//     let len = el.textContent.length;
//     let range = document.createRange();
//     for(let i = len -1; i > -1; i--) {
//         range.setStart(el, i);
//         range.setEnd(el, i + 1);
//         let rect = range.getBoundingClientRect();
//         if (rect.top === rect.bottom) {
//             continue;
//         }
//         if(rect.left <= horizontal_offset && rect.right >= horizontal_offset) {
//             return  i + (horizontal_offset >= (rect.left + rect.right) / 2 ? 1 : 0);    // if the horizontal_offset is on the left hand side of the
//                                                                                         // character then return `i`, if it's on the right return `i + 1`
//         }
//     }

//     return el.length;
// }

// // update the cursor position.
// function updateCursor(range) {
//     let selection = window.getSelection();
//      selection.removeAllRanges();
//     selection.addRange(range);
// }
