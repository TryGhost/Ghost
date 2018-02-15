/*
 * Based on ember-mobiledoc-editor
 * https://github.com/bustle/ember-mobiledoc-editor
 */

import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import Ember from 'ember';
import EmberObject from '@ember/object';
import Range from 'mobiledoc-kit/utils/cursor/range';
import defaultAtoms from '../options/atoms';
import defaultCards from '../options/cards';
import layout from '../templates/components/koenig-editor';
import registerKeyCommands from '../options/key-commands';
import registerTextExpansions from '../options/text-expansions';
import {A} from '@ember/array';
import {MOBILEDOC_VERSION} from 'mobiledoc-kit/renderers/mobiledoc';
import {assign} from '@ember/polyfills';
import {camelize, capitalize} from '@ember/string';
import {computed} from '@ember/object';
import {copy} from '@ember/object/internals';
import {run} from '@ember/runloop';

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

        let componentHooks = {
            // triggered when a card section is added to the mobiledoc
            [ADD_CARD_HOOK]: ({env, options, payload}) => {
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
        registerTextExpansions(editor);

        // the cursor is always positioned after a selected card so DELETE wont
        // work to remove the card like BACKSPACE does. Add a custom command to
        // override the default behaviour when a card is selected
        editor.registerKeyCommand({
            str: 'DEL',
            run: run.bind(this, this.handleDelKey)
        }),

        // by default mobiledoc-kit will remove the selected card but replace it
        // with a blank paragraph, we want the cursor to go to the previous
        // section instead
        editor.registerKeyCommand({
            str: 'BACKSPACE',
            run: run.bind(this, this.handleBackspaceKey)
        }),

        editor.registerKeyCommand({
            str: 'UP',
            run: run.bind(this, this.handleUpKey)
        });

        editor.registerKeyCommand({
            str: 'LEFT',
            run: run.bind(this, this.handleLeftKey)
        });

        editor.registerKeyCommand({
            str: 'META+ENTER',
            run: run.bind(this, this.handleCmdEnter)
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
                let needsTrailingParagraph = !section.next;

                postEditor.replaceSection(section, card);

                if (needsTrailingParagraph) {
                    let newSection = postEditor.builder.createMarkupSection('p');
                    postEditor.insertSectionAtEnd(newSection);
                    postEditor.setRange(newSection.tailPosition());
                }
            });

            // cards are pushed on to the `componentCards` array so we can
            // assume that the last card in the list is the one we want to
            // select. Needs to be scheduled afterRender so that the new card
            // is actually present
            run.schedule('afterRender', this, function () {
                let card = this.get('componentCards.lastObject');
                this.editCard(card);
            });
        },

        replaceWithListSection(listType, range) {
            let editor = this.get('editor');
            let {head: {section}} = range;

            editor.run((postEditor) => {
                let {builder} = postEditor;
                let item = builder.createListItem();
                let listSection = builder.createListSection(listType, [item]);

                postEditor.replaceSection(section, listSection);
                postEditor.setRange(listSection.headPosition());
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
        let selectedRange = this.get('selectedRange');

        // sometimes we perform a programatic edit that causes a cursor change
        // but we actually want to skip the default behaviour because we've
        // already handled it, e.g. on card insertion, manual card selection
        if (this._skipCursorChange) {
            this._skipCursorChange = false;
            this.set('selectedRange', editor.range);
            return;
        }

        // skip everything if the cursor is just moving from the end of a card
        // section to the beginning whilst a card is in edit mode, this prevents
        // clicks within a card causing the card to be deselected. Only applies
        // when a card is in edit mode otherwise it's necessary to press LEFT
        // twice to cycle up through cards
        if (this._selectedCard && this._selectedCard.isEditing && selectedRange && isCollapsed && editor.range.headSection === selectedRange.headSection && editor.range.head.offset === 0 && selectedRange.head.offset === 1) {
            return;
        }

        // if we have a selected card but cursor has moved to the left then
        // deselect and move cursor to end of the previous section
        if (this._selectedCard && section && isCollapsed && section.type === 'card-section' && head.offset === 0) {
            this.deselectCard(this._selectedCard);

            if (section.prev) {
                editor.run((postEditor) => {
                    postEditor.setRange(section.prev.tailPosition().toRange());
                });
            } else {
                // card was at the top of the doc so we should trigger an external
                // action - gh-koenig-editor uses it to move focus to the title input
                this.cursorDidExitAtTop();
            }

            this.set('selectedRange', editor.range);
            return;
        }

        // select the card if the cursor is on the before/after &zwnj; char
        if (section && isCollapsed && section.type === 'card-section') {
            if (head.offset === 0 || head.offset === 1) {
                let card = this._getCardFromSection(section);
                this.selectCard(card);
                this.set('selectedRange', editor.range);
                return;
            }
        }

        // deselect any selected card because the cursor is no longer on a card
        if (this._selectedCard) {
            this.deselectCard(this._selectedCard);
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

    handleBackspaceKey() {
        let {isCollapsed, head: {offset, section}} = this.editor.range;

        // if a card is selected we should delete the card then place the cursor
        // at the end of the previous section
        if (this._selectedCard) {
            let cursorPosition = section.prev ? CURSOR_BEFORE : CURSOR_AFTER;
            this._deleteCard(this._selectedCard, cursorPosition);
            return;
        }

        // if the section about to be deleted by a backspace is a card then
        // actually delete the card rather than selecting it
        if (isCollapsed && offset === 0 && section.prev && section.prev.type === 'card-section') {
            let card = this._getCardFromSection(section.prev);
            this._deleteCard(card, CURSOR_AFTER);
            return;
        }

        return false;
    },

    handleDelKey() {
        let {isCollapsed, head: {offset, section}} = this.editor.range;

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
        // delete the card
        if (isCollapsed && offset === section.length && section.next && section.next.type === 'card-section') {
            let card = this._getCardFromSection(section.next);
            this._deleteCard(card, CURSOR_BEFORE);
            return;
        }

        return false;
    },

    handleUpKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;

        if (isCollapsed && !section.prev && offset === 0) {
            this.cursorDidExitAtTop();
        }

        return false;
    },

    handleLeftKey(editor) {
        let {isCollapsed, head: {offset, section}} = editor.range;

        if (isCollapsed && !section.prev && offset === 0) {
            this.cursorDidExitAtTop();
            return;
        }

        return false;
    },

    handleCmdEnter() {
        if (this._selectedCard) {
            this.editCard(this._selectedCard);
            return;
        }

        return false;
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
        this.editor.run((postEditor) => {
            let range = section.tailPosition().toRange();

            // don't trigger another cursor change selection after selecting
            if (!range.isEqual(this.editor.range)) {
                this._skipCursorChange = true;
            }

            postEditor.setRange(range);
        });
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

    _deleteCard(card, cursorDirection) {
        this.editor.run((postEditor) => {
            let section = card.env.postModel;
            let rangeStart, rangeEnd;

            if (cursorDirection === CURSOR_BEFORE) {
                rangeStart = section.prev ? section.prev.tailPosition() : section.headPosition();
                rangeEnd = section.tailPosition();
            } else {
                rangeStart = section.headPosition();
                rangeEnd = section.next ? section.next.headPosition() : section.tailPosition();
            }

            let range = new Range(rangeStart, rangeEnd);
            let nextPosition = postEditor.deleteRange(range);
            postEditor.setRange(nextPosition);
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
