import $ from 'jquery';
import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import Ember from 'ember';
import counter from 'ghost-admin/utils/word-count';
import createCardFactory from '../lib/card-factory';
import defaultCards from '../cards/index';
import layout from '../templates/components/gh-koenig';
import registerKeyCommands from '../options/key-commands';
import registerTextExpansions from '../options/text-expansions';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import {assign} from '@ember/polyfills';
import {
    checkIfClickEventShouldCloseCard,
    getCardFromDoc,
    getPositionOnScreenFromRange
} from '../lib/utils';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';

// ember-cli-shims doesn't export Ember.testing
const {testing} = Ember;

export const TESTING_EXPANDO_PROPERTY = '__koenig_editor';

export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    markups: [],
    atoms: [],
    cards: [],
    sections: [[1, 'p', [[0, [], 0, '']]]]
};

export default Component.extend({
    layout,
    classNames: ['gh-koenig-container'],

    // exterally set properties
    mobiledoc: null,
    placeholder: 'Click here to start ...',
    spellcheck: true,
    autofocus: false,
    cards: null,
    atoms: null,
    serializeVersion: MOBILEDOC_VERSION,
    options: null,

    // exposed properties
    editor: null,
    editedCard: null,
    selectedCard: null,
    emberCards: null,
    isMenuOpen: false,
    editorHasRendered: false,

    // internal properties
    _domContainer: null,
    // TODO: keyDownHandler is assigned event handlers when a card is
    // hard-selected, is there a better way of handling this?
    _keyDownHandler: null,

    // merge in named options with the `options` property data-bag
    editorOptions: computed(function () {
        let options = this.get('options') || {};
        let cards = this.get('cards') || [];
        let atoms = this.get('atoms') || [];

        // use our CardFactory to wrap our default and any user-supplied cards
        // with Ghost specific functionality
        // TODO: this also sets the emberCards property - do we need that indirection?
        let createCard = createCardFactory.apply(this, {}); // need to pass the toolbar
        cards = defaultCards.concat(cards).map(card => createCard(card));

        // add our default atoms
        atoms = atoms.concat([{
            name: 'soft-return',
            type: 'dom',
            render() {
                return document.createElement('br');
            }
        }]);

        return assign({
            placeholder: this.get('placeholder'),
            spellchack: this.get('spellcheck'),
            autofocus: this.get('autofocus'),
            // cardOptions: this.get('cardOptions'),
            cards,
            atoms
        }, options);
    }),

    init() {
        this._super(...arguments);

        // grab the supplied mobiledoc value - if it's empty set our default
        // blank document, if it's a JSON string then deserialize it
        let mobiledoc = this.get('mobiledoc');
        if (!mobiledoc) {
            mobiledoc = BLANK_DOC;
            this.set('mobiledoc', mobiledoc);
        }
        if (typeof mobiledoc === 'string') {
            mobiledoc = JSON.parse(mobiledoc);
            this.set('mobiledoc', mobiledoc);
        }

        this.set('emberCards', []);
        this._keyDownHandler = [];

        // we use css media width for most things but need to know if a device is touch
        // to place the toolbar. Above the selected content on a mobile browser is the
        // cut | copy | paste menu so we need to place our toolbar below.
        // TODO: is this reliable enough? What about most Windows laptops now being touch enabled?
        this.set('isTouch', 'ontouchstart' in document.documentElement);

        this._startedRunLoop = false;
    },

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.get('autofocus') !== this._autofocus) {
            this._autofocus = this.get('autofocus');
            this._hasAutofocused = false;
        }
    },

    willRender() {
        // Use a default mobiledoc. If there are no changes, then return early.
        let mobiledoc = this.get('mobiledoc') || BLANK_DOC;

        let noMobiledocChanges
            = (this._localMobiledoc && this._localMobiledoc === mobiledoc)
            || (this._upstreamMobiledoc && this._upstreamMobiledoc === mobiledoc);

        if (noMobiledocChanges) {
            return;
        }

        // reset everything ready for an editor re-render
        this._upstreamMobiledoc = mobiledoc;
        this._localMobiledoc = null;

        // trigger hook action
        this._willCreateEditor();

        // teardown any old editor that might be around
        let editor = this.get('editor');
        if (editor) {
            editor.destroy();
        }

        // create a new editor
        let editorOptions = this.get('editorOptions');
        editorOptions.mobiledoc = mobiledoc;

        // TODO: instantiate component hooks?
        // https://github.com/bustlelabs/ember-mobiledoc-editor/blob/master/addon/components/mobiledoc-editor/component.js#L163-L227

        editor = new Editor(editorOptions);

        // set up our default key handling and text expansions to emulate MD behaviour
        // TODO: better place to do this?
        registerKeyCommands(editor);
        registerTextExpansions(editor);

        editor.willRender(() => {
            // The editor's render/rerender will happen after this `editor.willRender`,
            // so we explicitly start a runloop here if there is none, so that the
            // add/remove card hooks happen inside a runloop.
            // When pasting text that gets turned into a card, for example,
            // the add card hook would run outside the runloop if we didn't begin a new
            // one now.
            if (!run.currentRunLoop) {
                this._startedRunLoop = true;
                run.begin();
            }
        });

        editor.didRender(() => {
            // If we had explicitly started a run loop in `editor.willRender`,
            // we must explicitly end it here.
            if (this._startedRunLoop) {
                this._startedRunLoop = false;
                run.end();
            }

            this.set('editorHasRendered', true);
        });

        editor.postDidChange(() => {
            run.join(() => {
                this.postDidChange(editor);
            });
        });

        editor.cursorDidChange(() => {
            if (this.isDestroyed) {
                return;
            }
            run.join(() => {
                this.cursorMoved();
            });
        });

        this.set('editor', editor);

        // trigger hook action
        this._didCreateEditor(editor);
    },

    didRender() {
        // listen to keydown events outside of the editor, used to handle keydown
        // events in the cards.
        // TODO: is there a better way to handle this?
        if (!document.onkeydown) {
            document.onkeydown = event => this._keyDownHandler.reduce((returnType, handler) => {
                let result = handler(event);
                if (returnType !== false) {
                    return result;
                }
                return returnType;
            }, true);
        }

        let editor = this.get('editor');
        if (!editor.hasRendered) {
            let $editor = this.$('.gh-koenig-surface');
            let [domContainer] = $editor.parents(this.get('containerSelector'));
            let [editorDom] = $editor;

            editorDom.tabindex = this.get('tabindex');
            this._domContainer = domContainer;

            this._isRenderingEditor = true;
            editor.render(editorDom);
            this._isRenderingEditor = false;
        }
        this._setExpandoProperty(editor);

        // autofocus is only true when transitioning from new to edit,
        // otherwise it's false or undefined. therefore, if it's true it's after
        // the first lot of content is entered and we expect the caret to be at
        // the end of the document.
        // TODO: can this be removed if we refactor the new/edit screens to not re-render?
        if (this._autofocus && !this._hasAutofocused) {
            let range = document.createRange();
            range.selectNodeContents(this.editor.element);
            range.collapse(false);
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            editor._ensureFocus(); // PRIVATE API

            // ensure we don't run the autofocus more than once between
            // `autofocus` attr changes
            this._hasAutofocused = true;
        }

        this.processWordcount();
    },

    willDestroyElement() {
        this.editor.destroy();
        this.send('deselectCard');
        // TODO: should we be killing all global onkeydown event handlers?
        document.onkeydown = null;
    },

    actions: {
        // thin border, shows that a card is selected but the user cannot delete
        // the card with keyboard events.
        // used when the content of the card is selected and it is editing.
        selectCard(cardId) {
            if (!cardId) {
                throw new Error('A selection must include a cardId');
            }

            let card = this.get('emberCards').find(card => card.id === cardId);
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
            this._keyDownHandler.length = 0;
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

            // don't hard select an editing card.
            if (this.editedCard && this.editedCard.id === cardId) {
                this.send('editCard', cardId);
                return;
            }

            let card = this.get('emberCards').find(card => card.id === cardId);
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

            this._keyDownHandler.push((event) => {
                let editor = this.get('editor');
                switch (event.keyCode) {
                case 37: // arrow left
                case 38: // arrow up
                    getCardFromDoc(cardId, editor)
                        .then((section) => {
                            if (section.prev && section.prev.isCardSection) {
                                let prevCard = ($(section.prev.renderNode.element).find('.gh-card-holder').attr('id'));
                                if (prevCard) {
                                    this.send('selectCardHard', prevCard);
                                }
                            } else if (section.prev) {
                                let range = section.prev.toRange();
                                range.head.offset = range.tail.offset;
                                editor.selectRange(range);
                            } else {
                                $(this.get('titleSelector')).focus();
                                this.send('deselectCard');
                            }
                        });
                    return false;
                case 39: // arrow right
                case 40: // arrow down
                    getCardFromDoc(cardId, editor)
                        .then((section) => {
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
                        });

                    return false;
                case 13: // enter
                    getCardFromDoc(cardId, editor)
                        .then((section) => {
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
                            this.send('deselectCard');
                        });
                    return false;
                case 27: // escape
                    this.send('selectCard', cardId);
                    return false;
                case 8: // backspace
                    this.send('deleteCard', cardId);
                    return false;
                case 46: // delete
                    this.send('deleteCard', cardId, true);
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
            this._keyDownHandler.length = 0;
            // TODO: do we want to kill all document onclick handlers?
            document.onclick = null;

            this.set('editedCard', null);
        },

        editCard(cardId) {
            let card = this.get('emberCards').find(card => card.id === cardId);
            this.set('editedCard', card);
            this.send('selectCard', cardId);
        },

        deleteCard(cardId, forwards = false) {
            let editor = this.get('editor');
            let card = this.get('emberCards').find(card => card.id === cardId);

            getCardFromDoc(cardId, editor).then(function (section) {
                let range;
                if (forwards && section.next) {
                    range = section.next.toRange();
                    range.tail.offset = 0;
                } else if (section.prev) {
                    range = section.prev.toRange();
                    range.head.offset = range.tail.offset;
                } else if (section.next) {
                    range = section.next.toRange();
                    range.tail.offset = 0;
                } else {
                    card.env.remove();
                    return;
                }

                card.env.remove();
                editor.selectRange(range);
            });
        },

        stopEditingCard() {
            this.set('editedCard', null);
        },

        menuOpened() {
            this.set('isMenuOpen', true);
        },

        menuClosed() {
            this.set('isMenuOpen', false);
        },

        // drag and drop images onto the editor
        dropImage(event) {
            if (event.dataTransfer.files.length) {
                event.preventDefault();
                for (let i = 0; i < event.dataTransfer.files.length; i += 1) {
                    let file = [event.dataTransfer.files[i]];
                    this.editor.insertCard('card-image', {pos: 'top', file});
                }
            }
        },

        dragOver(event) {
            // required for drop events to fire on markdown cards in firefox.
            event.preventDefault();
        }
    },

    // makes sure the cursor is on screen except when selection is happening in
    // which case the browser mostly ensures it. there is an issue with keyboard
    // selection on some browsers though so the next step may be to record mouse
    // and touch events.
    cursorMoved() {
        let editor = this.get('editor');

        if (editor.range.isCollapsed) {
            let scrollBuffer = 33; // the extra buffer to scroll.

            let position = getPositionOnScreenFromRange(editor, $(this.get('containerSelector')));

            if (!position) {
                return;
            }

            let windowHeight = window.innerHeight;

            if (position.bottom > windowHeight) {
                this._domContainer.scrollTop += position.bottom - windowHeight + scrollBuffer;
            } else if (position.top < 0) {
                this._domContainer.scrollTop += position.top - scrollBuffer;
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

    // NOTE: This wordcount function doesn't count words that have been entered in cards.
    // We should either allow cards to report their own wordcount or use the DOM
    // (innerText) to calculate the wordcount.
    processWordcount() {
        let wordcount = 0;
        if (this.editor.post.sections.length) {
            this.editor.post.sections.forEach((section) => {
                if (section.isMarkerable && section.text.length) {
                    wordcount += counter(section.text);
                } else if (section.isCardSection && section.payload.wordcount) {
                    wordcount += Number(section.payload.wordcount);
                }
            });
        }

        let action = this.get('wordcountDidChange');
        if (action) {
            action(wordcount);
        }
    },

    _willCreateEditor() {
        let action = this.get('willCreateEditor');
        if (action) {
            action();
        }
    },

    _didCreateEditor(editor) {
        let action = this.get('didCreateEditor');
        if (action) {
            action(editor);
        }
    },

    postDidChange(editor) {
        // store a cache of the local doc so that we don't need to reinitialise it.
        let serializeVersion = this.get('serializeVersion');
        let updatedMobiledoc = editor.serialize(serializeVersion);
        let onChangeAction = this.get('onChange');
        let onFirstChangeAction = this.get('onFirstChange');

        this._localMobiledoc = updatedMobiledoc;

        if (onChangeAction) {
            onChangeAction(updatedMobiledoc);
        }

        // we need to trigger a first-change action so that we can trigger a
        // save and transition from new-> edit
        if (this._localMobiledoc !== BLANK_DOC && !this._hasChanged) {
            this._hasChanged = true;

            if (onFirstChangeAction) {
                onFirstChangeAction(this._localMobiledoc);
            }
        }

        this.processWordcount();
    },

    _setExpandoProperty(editor) {
        // Store a reference to the editor for the acceptance test helpers
        if (this.element && testing) {
            this.element[TESTING_EXPANDO_PROPERTY] = editor;
        }
    }
});
