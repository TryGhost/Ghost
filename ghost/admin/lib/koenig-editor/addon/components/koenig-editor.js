/*
 * Based on ember-mobiledoc-editor
 * https://github.com/bustle/ember-mobiledoc-editor
 */

import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import Ember from 'ember';
import EmberObject from '@ember/object';
import defaultAtoms from '../options/atoms';
import defaultCards from '../options/cards';
import layout from '../templates/components/koenig-editor';
import registerKeyCommands from '../options/key-commands';
import registerTextExpansions from '../options/text-expansions';
import validator from 'npm:validator';
import {A} from '@ember/array';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import {assign} from '@ember/polyfills';
import {camelize, capitalize} from '@ember/string';
import {computed} from '@ember/object';
import {copy} from '@ember/object/internals';
import {getContentFromPasteEvent} from 'mobiledoc-kit/utils/parse-utils';
import {run} from '@ember/runloop';

const UNDO_DEPTH = 50;

export const ADD_CARD_HOOK = 'addComponent';
export const REMOVE_CARD_HOOK = 'removeComponent';

// used in test helpers to grab a reference to the underlying mobiledoc editor
export const TESTING_EXPANDO_PROPERTY = '__mobiledoc_kit_editor';

// blank doc contains a single empty paragraph so that there's some content for
// the cursor to start in
export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    markups: [],
    atoms: [],
    cards: [],
    sections: [
        [1, 'p', [
            [0, [], 0, '']
        ]]
    ]
};

// map card names to component names
export const CARD_COMPONENT_MAP = {
    hr: 'koenig-card-hr',
    image: 'koenig-card-image',
    markdown: 'koenig-card-markdown',
    'card-markdown': 'koenig-card-markdown', // backwards-compat with markdown editor
    html: 'koenig-card-html'
};

const CURSOR_BEFORE = -1;
const CURSOR_AFTER = 1;
const NO_CURSOR_MOVEMENT = 0;

// markups that should not be continued when typing and reverted to their
// text expansion style when backspacing over findal char of markup
const SPECIAL_MARKUPS = {
    S: '~~',
    CODE: '`'
};

function arrayToMap(array) {
    let map = Object.create(null);
    array.forEach((key) => {
        if (key) { // skip undefined/falsy key values
            key = `is${capitalize(camelize(key))}`;
            map[key] = true;
        }
    });
    return map;
}

export default Component.extend({
    layout,

    tagName: 'article',
    classNames: ['koenig-editor'],

    // public attrs
    mobiledoc: null,
    placeholder: 'Write here...',
    autofocus: false,
    spellcheck: true,
    options: null,
    scrollContainer: '',

    // internal properties
    editor: null,
    activeMarkupTagNames: null,
    activeSectionTagNames: null,
    selectedRange: null,
    componentCards: null,
    linkRange: null,

    // private properties
    _localMobiledoc: null,
    _upstreamMobiledoc: null,
    _startedRunLoop: false,
    _lastIsEditingDisabled: false,
    _isRenderingEditor: false,
    _selectedCard: null,

    // closure actions
    willCreateEditor() {},
    didCreateEditor() {},
    onChange() {},
    cursorDidExitAtTop() {},

    /* computed properties -------------------------------------------------- */

    // merge in named options with the `options` property data-bag
    // TODO: what is the `options` property data-bag and when/where does it get set?
    editorOptions: computed(function () {
        let options = this.get('options') || {};
        let atoms = this.get('atoms') || [];
        let cards = this.get('cards') || [];

        // add our default atoms and cards, we want the defaults to be first so
        // that they can be overridden by any passed-in atoms or cards.
        // Use Array.concat to avoid modifying any passed in array references
        atoms = Array.concat(defaultAtoms, atoms);
        cards = Array.concat(defaultCards, cards);

        return assign({
            placeholder: this.get('placeholder'),
            spellcheck: this.get('spellcheck'),
            autofocus: this.get('autofocus'),
            atoms,
            cards
        }, options);
    }),

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        this._super(...arguments);

        // set a blank mobiledoc if we didn't receive anything
        let mobiledoc = this.get('mobiledoc');
        if (!mobiledoc) {
            mobiledoc = BLANK_DOC;
            this.set('mobiledoc', mobiledoc);
        }

        this.set('componentCards', A([]));
        this.set('activeMarkupTagNames', {});
        this.set('activeSectionTagNames', {});

        this._startedRunLoop = false;
    },

    willRender() {
        // use a default mobiledoc. If there are no changes then return early
        let mobiledoc = this.get('mobiledoc') || BLANK_DOC;
        let mobiledocIsSame =
            (this._localMobiledoc && this._localMobiledoc === mobiledoc) ||
            (this._upstreamMobiledoc && this._upstreamMobiledoc === mobiledoc);
        let isEditingDisabledIsSame =
            this._lastIsEditingDisabled === this.get('isEditingDisabled');

        // no change to mobiledoc, no need to recreate the editor
        if (mobiledocIsSame && isEditingDisabledIsSame) {
            return;
        }

        // update our internal references
        this._lastIsEditingDisabled = this.get('isEditingDisabled');
        this._upstreamMobiledoc = mobiledoc;
        this._localMobiledoc = null;

        // trigger the willCreateEditor closure action
        this.willCreateEditor();

        // teardown any old editor that might be around
        let editor = this.get('editor');
        if (editor) {
            editor.destroy();
        }

        // create a new editor
        let editorOptions = this.get('editorOptions');
        editorOptions.mobiledoc = mobiledoc;
        editorOptions.showLinkTooltips = false;
        editorOptions.undoDepth = UNDO_DEPTH;

        let componentHooks = {
            // triggered when a card section is added to the mobiledoc
            [ADD_CARD_HOOK]: ({env, options, payload}, koenigOptions) => {
                let cardId = Ember.uuid();
                let cardName = env.name;
                let componentName = CARD_COMPONENT_MAP[cardName];

                // the desination element is the container that gets rendered
                // inside the editor, once rendered we use {{-in-element}} to
                // wormhole in the actual ember component
                let destinationElementId = `koenig-editor-card-${cardId}`;
                let destinationElement = document.createElement('div');
                destinationElement.id = destinationElementId;

                // the payload must be copied to avoid sharing the reference
                payload = copy(payload, true);

                // all of the properties that will be passed through to the
                // component cards via the template
                let card = EmberObject.create({
                    destinationElement,
                    destinationElementId,
                    cardName,
                    componentName,
                    koenigOptions,
                    payload,
                    env,
                    options,
                    editor,
                    postModel: env.postModel,
                    isSelected: false,
                    isEditing: false
                });

                // after render we render the full ember card via {{-in-element}}
                run.schedule('afterRender', () => {
                    this.get('componentCards').pushObject(card);
                });

                // render the destination element inside the editor
                return {card, element: destinationElement};
            },
            // triggered when a card section is removed from the mobiledoc
            [REMOVE_CARD_HOOK]: (card) => {
                this.get('componentCards').removeObject(card);
            }
        };
        editorOptions.cardOptions = componentHooks;

        editor = new Editor(editorOptions);

        // set up key commands and text expansions (MD conversion)
        // TODO: this will override any passed in options, we should allow the
        // default behaviour to be overridden by addon consumers
        registerKeyCommands(editor);
        registerTextExpansions(editor, this);

        editor.registerKeyCommand({
            str: 'ENTER',
            run: run.bind(this, this.handleEnterKey, editor)
        }),

        // the cursor is always positioned after a selected card so DELETE wont
        // work to remove the card like BACKSPACE does. Add a custom command to
        // override the default behaviour when a card is selected
        editor.registerKeyCommand({
            str: 'DEL',
            run: run.bind(this, this.handleDelKey, editor)
        }),

        // by default mobiledoc-kit will remove the selected card but replace it
        // with a blank paragraph, we want the cursor to go to the previous
        // section instead
        editor.registerKeyCommand({
            str: 'BACKSPACE',
            run: run.bind(this, this.handleBackspaceKey, editor)
        }),

        editor.registerKeyCommand({
            str: 'UP',
            run: run.bind(this, this.handleUpKey, editor)
        });

        editor.registerKeyCommand({
            str: 'LEFT',
            run: run.bind(this, this.handleLeftKey, editor)
        });

        editor.registerKeyCommand({
            str: 'META+ENTER',
            run: run.bind(this, this.handleCmdEnter, editor)
        });

        // set up editor hooks
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
            // if we had explicitly started a runloop in `editor.willRender`,
            // we must explicitly end it here
            if (this._startedRunLoop) {
                this._startedRunLoop = false;
                run.end();
            }
        });

        editor.postDidChange(() => {
            run.join(() => {
                this.postDidChange(editor);
            });
        });

        editor.cursorDidChange(() => {
            run.join(() => {
                this.cursorDidChange(editor);
            });
        });

        editor.inputModeDidChange(() => {
            if (this.isDestroyed) {
                return;
            }
            run.join(() => {
                this.inputModeDidChange(editor);
            });
        });

        if (this.get('isEditingDisabled')) {
            editor.disableEditing();
        }

        this.set('editor', editor);
        this.didCreateEditor(editor);
    },

    didInsertElement() {
        this._super(...arguments);
        let editorElement = this.element.querySelector('.koenig-editor__editor');

        this._pasteHandler = run.bind(this, this.handlePaste);
        editorElement.addEventListener('paste', this._pasteHandler);
    },

    // our ember component has rendered, now we need to render the mobiledoc
    // editor itself if necessary
    didRender() {
        this._super(...arguments);
        let editor = this.get('editor');
        if (!editor.hasRendered) {
            let editorElement = this.element.querySelector('.koenig-editor__editor');
            this._isRenderingEditor = true;
            editor.render(editorElement);
            this._isRenderingEditor = false;
        }
    },

    willDestroyElement() {
        let editor = this.get('editor');
        let editorElement = this.element.querySelector('.koenig-editor__editor');

        editorElement.removeEventListener('paste', this._pasteHandler);
        editor.destroy();
        this._super(...arguments);
    },

    actions: {
        toggleMarkup(markupTagName) {
            let editor = this.get('editor');
            editor.toggleMarkup(markupTagName);
        },

        toggleSection(sectionTagName) {
            let editor = this.get('editor');
            editor.toggleSection(sectionTagName);
        },

        replaceWithCardSection(cardName, range) {
            let editor = this.get('editor');
            let {head: {section}} = range;

            editor.run((postEditor) => {
                let {builder} = postEditor;
                let card = builder.createCardSection(cardName);
                let nextSection = section.next;
                let needsTrailingParagraph = !nextSection;

                postEditor.replaceSection(section, card);

                // add an empty paragraph after if necessary so writing can continue
                if (needsTrailingParagraph) {
                    let newSection = postEditor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                    postEditor.setRange(newSection.tailPosition());
                } else {
                    postEditor.setRange(nextSection.headPosition());
                }
            });

            // cards are pushed on to the `componentCards` array so we can
            // assume that the last card in the list is the one we want to
            // select. Needs to be scheduled afterRender so that the new card
            // is actually present
            run.schedule('afterRender', this, function () {
                let card = this.get('componentCards.lastObject');
                if (card.get('koenigOptions.hasEditMode')) {
                    this.editCard(card);
                } else if (card.get('koenigOptions.selectAfterInsert')) {
                    this.selectCard(card);
                }
            });
        },

        selectCard(card) {
            this.selectCard(card);
        },

        editCard(card) {
            this.editCard(card);
        },

        deselectCard(card) {
            this.deselectCard(card);
        },

        // range should be set to the full extent of the selection or the
        // appropriate <a> markup. If there's a selection when the link edit
        // component renders it will re-select when finished which should
        // trigger the normal toolbar
        editLink(range) {
            this.set('linkRange', range);
        },

        cancelEditLink() {
            this.set('linkRange', null);
        },

        deleteCard(card, cursorMovement = NO_CURSOR_MOVEMENT) {
            this._deleteCard(card, cursorMovement);
        },

        moveCursorToPrevSection(card) {
            let section = this._getSectionFromCard(card);

            if (section.prev) {
                this.deselectCard(card);
                this._moveCaretToTailOfSection(section.prev, false);
            }
        },

        moveCursorToNextSection(card) {
            let section = this._getSectionFromCard(card);

            if (section.next) {
                this.deselectCard(card);
                this._moveCaretToHeadOfSection(section.next, false);
            } else {
                this.send('addParagraphAfterCard', card);
            }
        },

        addParagraphAfterCard(card) {
            let editor = this.get('editor');
            let section = this._getSectionFromCard(card);
            let collection = section.parent.sections;
            let nextSection = section.next;

            this.deselectCard(card);

            editor.run((postEditor) => {
                let {builder} = postEditor;
                let newPara = builder.createMarkupSection('p');

                if (nextSection) {
                    postEditor.insertSectionBefore(collection, newPara, nextSection);
                } else {
                    postEditor.insertSectionAtEnd(newPara);
                }

                postEditor.setRange(newPara.tailPosition());
            });
        }
    },

    /* public methods ------------------------------------------------------- */

    postDidChange(editor) {
        let serializeVersion = this.get('serializeVersion');
        let updatedMobiledoc = editor.serialize(serializeVersion);
        this._localMobiledoc = updatedMobiledoc;

        // trigger closure action
        this.onChange(updatedMobiledoc);
    },

    cursorDidChange(editor) {
        let {head, isCollapsed, head: {section}} = editor.range;

        // sometimes we perform a programatic edit that causes a cursor change
        // but we actually want to skip the default behaviour because we've
        // already handled it, e.g. on card insertion, manual card selection
        if (this._skipCursorChange) {
            this._skipCursorChange = false;
            this.set('selectedRange', editor.range);
            return;
        }

        // ignore the cursor moving from one end to the other within a selected
        // card section, clicking and other interactions within a card can cause
        // this to happen and we don't want to select/deselect accidentally.
        // See the up/down/left/right key handlers for the card selection
        if (this._selectedCard && this._selectedCard.postModel === section) {
            return;
        }

        // select the card if the cursor is on the before/after &zwnj; char
        if (section && isCollapsed && section.type === 'card-section') {
            if (head.offset === 0 || head.offset === 1) {
                // select card after render to ensure that our componentCards
                // attr is populated
                run.schedule('afterRender', this, () => {
                    let card = this._getCardFromSection(section);
                    this.selectCard(card);
                    this.set('selectedRange', editor.range);
                });
                return;
            }
        }

        // deselect any selected card because the cursor is no longer on a card
        if (this._selectedCard && !editor.range.isBlank) {
            this.deselectCard(this._selectedCard);
        }

        // if we have `code` or ~strike~ formatting to the left but not the right
        // then toggle the formatting - these formats should only be creatable
        // through the text expansions
        // HACK: this is largely duplicated in `inputModeDidChange` to work
        // around an event ordering bug - see comments there
        if (isCollapsed && head.marker) {
            Object.keys(SPECIAL_MARKUPS).forEach((tagName) => {
                if (head.marker.hasMarkup(tagName)) {
                    let nextMarker = head.markerIn(1);
                    if (!nextMarker || !nextMarker.hasMarkup(tagName)) {
                        run.next(this, function () {
                            editor.toggleMarkup(tagName);
                        });
                    }
                }
            });
        }

        // pass the selected range through to the toolbar + menu components
        this.set('selectedRange', editor.range);
    },

    // fired when the active section(s) or markup(s) at the current cursor
    // position or selection have changed. We use this event to update the
    // activeMarkup/section tag lists which control button states in our popup
    // toolbar
    inputModeDidChange(editor) {
        let markupTags = arrayToMap(editor.activeMarkups.map(m => m.tagName));
        // editor.activeSections are leaf sections.
        // Map parent section tag names (e.g. 'p', 'ul', 'ol') so that list buttons
        // are updated.
        // eslint-disable-next-line no-confusing-arrow
        let sectionParentTagNames = editor.activeSections.map(s => s.isNested ? s.parent.tagName : s.tagName);
        let sectionTags = arrayToMap(sectionParentTagNames);

        // HACK: this is largly duplicated with our `cursorDidChange` handling.
        // On keyboard cursor movement our `cursorDidChange` toggle for special
        // formats happens before mobiledoc's readstate updates activeMarkups
        // so we have to re-do it here
        let {head, isCollapsed} = editor.range;
        if (isCollapsed) {
            let activeMarkupTagNames = editor.activeMarkups.mapBy('tagName');
            Object.keys(SPECIAL_MARKUPS).forEach((tagName) => {
                if (activeMarkupTagNames.includes(tagName.toLowerCase())) {
                    let nextMarker = head.markerIn(1);
                    if (!nextMarker || !nextMarker.hasMarkup(tagName)) {
                        return editor.toggleMarkup(tagName);
                    }
                }
            });
        }

        // Avoid updating this component's properties synchronously while
        // rendering the editor (after rendering the component) because it
        // causes Ember to display deprecation warnings
        if (this._isRenderingEditor) {
            run.schedule('afterRender', () => {
                this.set('activeMarkupTagNames', markupTags);
                this.set('activeSectionTagNames', sectionTags);
            });
        } else {
            this.set('activeMarkupTagNames', markupTags);
            this.set('activeSectionTagNames', sectionTags);
        }
    },

    handleEnterKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;

        // if cursor is at beginning of a heading, insert a blank paragraph above
        if (isCollapsed && offset === 0 && section.tagName.match(/^h\d$/)) {
            editor.run((postEditor) => {
                let newPara = postEditor.builder.createMarkupSection('p');
                let collection = section.parent.sections;
                postEditor.insertSectionBefore(collection, newPara, section);
            });
            return;
        }

        return false;
    },

    handleBackspaceKey(editor) {
        let {head, isCollapsed, head: {marker, offset, section}} = editor.range;

        // if a card is selected we should delete the card then place the cursor
        // at the end of the previous section
        if (this._selectedCard) {
            let cursorPosition = section.prev ? CURSOR_BEFORE : CURSOR_AFTER;
            this._deleteCard(this._selectedCard, cursorPosition);
            return;
        }

        // if the caret is at the beginning of the doc, on a blank para, and
        // there are more sections then delete the para and trigger the
        // `cursorDidExitAtTop` closure action
        let isFirstSection = section === section.parent.sections.head;
        if (isFirstSection && isCollapsed && offset === 0 && (section.isBlank || section.text === '') && section.next) {
            this.editor.run((postEditor) => {
                postEditor.removeSection(section);
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
        if (isCollapsed && offset === 0 && section.prev && section.prev.type === 'card-section' && !section.isBlank) {
            let card = this._getCardFromSection(section.prev);
            this._deleteCard(card, CURSOR_AFTER);
            return;
        }

        // if cursor is at the beginning of a heading and previous section is a
        // blank paragraph, delete the blank paragraph
        if (isCollapsed && offset === 0 && section.tagName.match(/^h\d$/) && section.prev.tagName === 'p' && section.prev.isBlank) {
            editor.run((postEditor) => {
                postEditor.removeSection(section.prev);
            });
            return;
        }

        // if the markup about to be deleted is a special format (code, strike)
        // then undo the text expansion to allow it to be extended
        if (isCollapsed && marker) {
            let specialMarkupTagNames = Object.keys(SPECIAL_MARKUPS);
            let hasReversed = false;
            specialMarkupTagNames.forEach((tagName) => {
                // only continue if we're about to delete a special markup
                let markup = marker.markups.find(markup => markup.tagName.toUpperCase() === tagName);
                if (markup) {
                    let nextMarker = head.markerIn(1);
                    // ensure we're at the end of the markup not inside it
                    if (!nextMarker || !nextMarker.hasMarkup(tagName)) {
                        // wrap with the text expansion, remove formatting, then delete the last char
                        editor.run((postEditor) => {
                            let markdown = SPECIAL_MARKUPS[tagName];
                            let range = editor.range.expandByMarker(marker => !!marker.markups.includes(markup));
                            postEditor.insertText(range.head, markdown);
                            range = range.extend(markdown.length);
                            let endPos = postEditor.insertText(range.tail, markdown);
                            range = range.extend(markdown.length);
                            postEditor.toggleMarkup(tagName, range);
                            endPos = postEditor.deleteAtPosition(endPos, -1);
                            postEditor.setRange(endPos);
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
    },

    handleDelKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;

        // if a card is selected we should delete the card then place the cursor
        // at the beginning of the next section or select the following card
        if (this._selectedCard) {
            let selectNextCard = section.next.type === 'card-section';
            let nextCard = this._getCardFromSection(section.next);

            this._deleteCard(this._selectedCard, CURSOR_AFTER);

            if (selectNextCard) {
                this.selectCard(nextCard);
            }
            return;
        }

        // if the section about to be deleted by a DEL is a card then actually
        // delete the card rather than selecting it
        // However, if the current paragraph is blank then delete the paragraph
        // instead - allows blank paragraphs between cards to be deleted and
        // feels more natural
        if (isCollapsed && offset === section.length && section.next && section.next.type === 'card-section' && !section.isBlank) {
            let card = this._getCardFromSection(section.next);
            this._deleteCard(card, CURSOR_BEFORE);
            return;
        }

        return false;
    },

    // trigger a closure action to indicate that the caret "left" the top of
    // the editor canvas when pressing UP with the caret at the beginning of
    // the doc
    handleUpKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;
        let prevSection = section.isListItem ? section.parent.prev : section.prev;

        if (isCollapsed && offset === 0 && !prevSection) {
            this.cursorDidExitAtTop();
        }

        return false;
    },

    handleLeftKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;

        // trigger a closure action to indicate that the caret "left" the top of
        // the editor canvas if the caret is at the very beginning of the doc
        let prevSection = section.isListItem ? section.parent.prev : section.prev;
        if (isCollapsed && offset === 0 && !prevSection) {
            this.cursorDidExitAtTop();
            return;
        }

        // if we have a selected card move the caret to end of the previous
        // section because the cursor will likely be at the end of the card
        // section meaning the default behaviour would move the cursor to the
        // beginning and require two key presses instead of one
        if (this._selectedCard && this._selectedCard.postModel === section) {
            this._moveCaretToTailOfSection(section.prev, false);
            return;
        }

        return false;
    },

    // CMD+ENTER is our keyboard shortcut for putting a selected card into
    // edit mode
    handleCmdEnter() {
        if (this._selectedCard) {
            this.editCard(this._selectedCard);
            return;
        }

        return false;
    },

    // if a URL is pasted and we have a selection, make that selection a link
    handlePaste(event) {
        let editor = this.get('editor');
        let range = editor.range;

        // only attempt link if we have a text selection in a single section
        if (range && !range.isCollapsed && range.headSection === range.tailSection && range.headSection.isMarkerable) {
            let {text} = getContentFromPasteEvent(event);
            if (text && validator.isURL(text)) {
                let linkMarkup = editor.builder.createMarkup('a', {href: text});
                editor.run((postEditor) => {
                    postEditor.addMarkupToRange(range, linkMarkup);
                });
                editor.selectRange(range.tail);
                // prevent mobiledoc's default paste event handler firing
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }
    },

    selectCard(card, isEditing = false) {
        // no-op if card is already selected
        if (card === this._selectedCard && isEditing === card.isEditing) {
            return;
        }

        // deselect any already selected card
        if (this._selectedCard && card !== this._selectedCard) {
            this.deselectCard(this._selectedCard);
        }

        // setting a card as selected trigger's the cards didReceiveAttrs
        // hook where the actual selection state change happens. Put into edit
        // mode if necessary
        card.setProperties({
            isEditing,
            isSelected: true
        });
        this._selectedCard = card;

        // hide the cursor and place it after the card so that ENTER can
        // create a new paragraph and cursorDidExitAtTop gets fired on LEFT
        // if the card is at the top of the document
        this._hideCursor();
        let section = this._getSectionFromCard(card);
        this._moveCaretToTailOfSection(section);
    },

    editCard(card) {
        // no-op if card is already being edited
        if (card === this._selectedCard && card.isEditing) {
            return;
        }

        // select the card with edit mode
        this.selectCard(card, true);
    },

    deselectCard(card) {
        card.set('isEditing', false);
        card.set('isSelected', false);
        this._selectedCard = null;
        this._showCursor();
    },

    /* Ember event handlers ------------------------------------------------- */

    // disable dragging
    // TODO: needs testing for how this interacts with cards that have drag behaviour
    dragStart(event) {
        event.preventDefault();
    },

    /* internal methods ----------------------------------------------------- */

    _getCardFromSection(section) {
        if (!section || section.type !== 'card-section') {
            return;
        }

        let cardId = section.renderNode.element.querySelector('.__mobiledoc-card').firstChild.id;
        let cards = this.get('componentCards');

        return cards.findBy('destinationElementId', cardId);
    },

    _getSectionFromCard(card) {
        return card.env.postModel;
    },

    _moveCaretToHeadOfSection(section, skipCursorChange = true) {
        this._moveCaretToSection('head', section, skipCursorChange);
    },

    _moveCaretToTailOfSection(section, skipCursorChange = true) {
        this._moveCaretToSection('tail', section, skipCursorChange);
    },

    _moveCaretToSection(position, section, skipCursorChange = true) {
        this.editor.run((postEditor) => {
            let sectionPosition = position === 'head' ? section.headPosition() : section.tailPosition();
            let range = sectionPosition.toRange();

            // don't trigger another cursor change selection after selecting
            if (skipCursorChange && !range.isEqual(this.editor.range)) {
                this._skipCursorChange = true;
            }

            postEditor.setRange(range);
        });
    },

    _deleteCard(card, cursorDirection) {
        this.editor.run((postEditor) => {
            let section = card.env.postModel;
            let nextPosition;

            if (cursorDirection === CURSOR_BEFORE) {
                nextPosition = section.prev.tailPosition();
            } else {
                nextPosition = section.next.headPosition();
            }

            postEditor.removeSection(section);

            if (cursorDirection !== NO_CURSOR_MOVEMENT) {
                postEditor.setRange(nextPosition);
            }
        });
    },

    _hideCursor() {
        this.editor.element.style.caretColor = 'transparent';
    },

    _showCursor() {
        this.editor.element.style.caretColor = 'auto';
    },

    // store a reference to the editor for the acceptance test helpers
    _setExpandoProperty(editor) {
        if (this.element && Ember.testing) {
            this.element[TESTING_EXPANDO_PROPERTY] = editor;
        }
    }
});
