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
    sections: [[1, 'p', [[0, [], 0, '']]]]
};

export default Component.extend({
    layout,
    classNames: ['editor-holder'],
    emberCards: emberA([]),
    selectedCard: null,
    editedCard: null,
    keyDownHandler: [],
    resizeEvent: 0,
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

        this.set('editor', new Mobiledoc.Editor(options));

        // we use css media width for most things but need to know if a device is touch
        // to place the toolbar. Above the selected content on a mobile browser is the
        // cut | copy | paste menu so we need to place our toolbar below.
        this.set('isTouch', 'ontouchstart' in document.documentElement);

        // window resize handler - throttled
        // window.onresize = () => {
        //     let now = Date.now();
        //     if (now - 2000 > this.get('resizeEvent')) {
        //         this.set('resizeEvent', now);
        //     }
        // };

        run.next(() => {
            if (this.get('setEditor')) {
                this.sendAction('setEditor', this.get('editor'));
            }
        });
    },

    willRender() {
        if (this._rendered) {
            return;
        }
        let editor = this.get('editor');

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
        let editor = this.get('editor');
        let $editor = this.$('.surface');
        let [domContainer] = $editor.parents(this.get('containerSelector'));
        let [editorDom] = $editor;
        editorDom.tabindex = this.get('tabindex');
        this.set('domContainer', domContainer);

        editor.render(editorDom);
        this.set('_rendered', true);

        // set global editor for debugging and testing.
        window.editor = editor;

        defaultCommands(editor); // initialise the custom text handlers for MD, etc.
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
            editor._ensureFocus();
        }

        editor.cursorDidChange(() => this.cursorMoved());

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
            if (position.left === 0 && position.top === 0) {
                // in safari if the range is collapsed you can't get it's location.
                // this is a bug as it's against the spec.
                if (editor.range.section) {
                    position = editor.range.head.section.renderNode.element.getBoundingClientRect();
                } else {
                    return;
                }
            }
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
                // if the element is first and we create a card with the '/' menu then the cursor moves before
                // element is placed in the dom properly. So we figure it out another way.
                if (!id) {
                    id = editor.range.headSection.renderNode.element.children[0].children[0].id;
                }

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
        // window.oresize = null;
    },

    actions: {
        // thin border, shows that a card is selected but the user cannot delete the card with
        // keyboard events.
        // used when the content of the card is selected and it is editing.
        selectCard(cardId) {
            if (!cardId) {
                throw new Error('A selection must include a cardId');
            }

            let card = this.get('emberCards').find((card) => card.id === cardId);
            let cardHolder = $(`#${cardId}`).parent('.kg-card');
            let selectedCard = this.get('selectedCard');
            if (selectedCard && selectedCard !== card) {
                this.send('deselectCard');
            }
            // defer rendering until after the card is placed in the mobiledoc via the wormhole
            if (!cardHolder[0]) {
                run.schedule('afterRender', this, () => this.send('selectCard', cardId));
                return;
            }
            cardHolder.addClass('selected');
            cardHolder.removeClass('selected-hard');
            this.set('selectedCard', card);
            this.get('keyDownHandler').length = 0;
            // cardHolder.focus();
            document.onclick = (event) => {
                if (checkIfClickEventShouldCloseCard($(event.target), cardHolder)) {
                    this.send('deselectCard');
                }
            };
        },
        // thicker border and with keyboard events for moving around the editor
        // creating blocks under the card and deleting the card.
        // used when selecting the card with the keyboard or clicking on the toolbar.
        selectCardHard(cardId) {
            if (!cardId) {
                throw new Error('A selection must include a cardId');
            }

            let card = this.get('emberCards').find((card) => card.id === cardId);
            let cardHolder = $(`#${cardId}`).parents('.kg-card');
            let selectedCard = this.get('selectedCard');
            if (selectedCard && selectedCard !== card) {
                this.send('deselectCard');
            }
            // defer rendering until after the card is placed in the mobiledoc via the wormhole
            if (!cardHolder[0]) {
                run.schedule('afterRender', this, () => this.send('selectCardHard', cardId));
                return;
            }
            cardHolder.addClass('selected');
            cardHolder.addClass('selected-hard');
            this.set('selectedCard', card);

            document.onclick = (event) => {
                if (checkIfClickEventShouldCloseCard($(event.target), cardHolder)) {
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
                            if (section.prev && section.prev.isCardSection) {
                                let prevCard = ($(section.prev.renderNode.element).find('.gh-card-holder').attr('id'));
                                if (prevCard) {
                                    this.send('selectCardHard', prevCard);
                                }
                            } else if (section.prev) {
                                let range = section.prev.toRange();
                                range.tail.offset = 0;
                                editor.selectRange(range);
                            } else {
                                $(this.get('titleSelector')).focus();
                                this.send('deselectCard');
                            }
                        }
                    });
                    return false;
                case 39: // arrow right
                case 40: // arrow down
                    editor.post.sections.forEach((section) => {
                        let currentCard = $(section.renderNode.element);
                        if (currentCard.find(`#${cardId}`).length) {
                            if (section.next && section.next.isCardSection) {
                                let nextCard = ($(section.next.renderNode.element).find('.gh-card-holder').attr('id'));
                                if (nextCard) {
                                    this.send('selectCardHard', nextCard);
                                }
                            } else if (section.next) {
                                let range = section.next.toRange();
                                range.tail.offset = 0;
                                editor.selectRange(range);
                            } else {
                                $(this.get('titleSelector')).focus();
                                this.send('deselectCard');
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
                        this.send('deselectCard');
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
        },
        menuIsOpen() {
            this.sendAction('menuIsOpen');
        },
        menuIsClosed() {
            this.sendAction('menuIsClosed');
        }
    }

});

// takes two jquery objects, the target of a click event and a cardholder and sees if the click event should close the card or not
function checkIfClickEventShouldCloseCard(target, cardHolder) {
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
//         if (rect.left <= horizontal_offset && rect.right >= horizontal_offset) {
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
