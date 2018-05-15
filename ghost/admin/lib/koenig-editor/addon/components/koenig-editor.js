/*
 * Based on ember-mobiledoc-editor
 * https://github.com/bustle/ember-mobiledoc-editor
 */

import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import EmberObject, {computed} from '@ember/object';
import MobiledocRange from 'mobiledoc-kit/utils/cursor/range';
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
import {copy} from '@ember/object/internals';
import {getContentFromPasteEvent} from 'mobiledoc-kit/utils/parse-utils';
import {getLinkMarkupFromRange} from '../utils/markup-utils';
import {getOwner} from '@ember/application';
import {guidFor} from '@ember/object/internals';
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
    html: 'koenig-card-html',
    code: 'koenig-card-code'
};

export const CURSOR_BEFORE = -1;
export const CURSOR_AFTER = 1;
export const NO_CURSOR_MOVEMENT = 0;

// markups that should not be continued when typing and reverted to their
// text expansion style when backspacing over final char of markup
export const SPECIAL_MARKUPS = {
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
    classNames: ['koenig-editor', 'w-100', 'flex-grow', 'relative', 'center', 'mb0', 'mt0'],

    // public attrs
    mobiledoc: null,
    placeholder: 'Write here...',
    autofocus: false,
    spellcheck: true,
    options: null,
    scrollContainer: '',
    headerOffset: 0,

    // internal properties
    editor: null,
    activeMarkupTagNames: null,
    activeSectionTagNames: null,
    selectedRange: null,
    componentCards: null,
    linkRange: null,
    selectedCard: null,

    // private properties
    _localMobiledoc: null,
    _upstreamMobiledoc: null,
    _startedRunLoop: false,
    _lastIsEditingDisabled: false,
    _isRenderingEditor: false,
    _skipCursorChange: false,

    // closure actions
    willCreateEditor() {},
    didCreateEditor() {},
    onChange() {},
    cursorDidExitAtTop() {},

    /* computed properties -------------------------------------------------- */

    // merge in named options with the `options` property data-bag
    // TODO: what is the `options` property data-bag and when/where does it get set?
    editorOptions: computed(function () {
        let options = this.options || {};
        let atoms = this.atoms || [];
        let cards = this.cards || [];

        // add our default atoms and cards, we want the defaults to be first so
        // that they can be overridden by any passed-in atoms or cards.
        // Use Array.concat to avoid modifying any passed in array references
        atoms = Array.concat(defaultAtoms, atoms);
        cards = Array.concat(defaultCards, cards);

        return assign({
            placeholder: this.placeholder,
            spellcheck: this.spellcheck,
            autofocus: this.autofocus,
            atoms,
            cards
        }, options);
    }),

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        this._super(...arguments);

        // set a blank mobiledoc if we didn't receive anything
        let mobiledoc = this.mobiledoc;
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
        let mobiledoc = this.mobiledoc || BLANK_DOC;
        let mobiledocIsSame =
            (this._localMobiledoc && this._localMobiledoc === mobiledoc) ||
            (this._upstreamMobiledoc && this._upstreamMobiledoc === mobiledoc);
        let isEditingDisabledIsSame =
            this._lastIsEditingDisabled === this.isEditingDisabled;

        // no change to mobiledoc, no need to recreate the editor
        if (mobiledocIsSame && isEditingDisabledIsSame) {
            return;
        }

        // update our internal references
        this._lastIsEditingDisabled = this.isEditingDisabled;
        this._upstreamMobiledoc = mobiledoc;
        this._localMobiledoc = null;

        // trigger the willCreateEditor closure action
        this.willCreateEditor();

        // teardown any old editor that might be around
        let editor = this.editor;
        if (editor) {
            editor.destroy();
        }

        // create a new editor
        let editorOptions = this.editorOptions;
        editorOptions.mobiledoc = mobiledoc;
        editorOptions.showLinkTooltips = false;
        editorOptions.undoDepth = UNDO_DEPTH;

        let componentHooks = {
            // triggered when a card section is added to the mobiledoc
            [ADD_CARD_HOOK]: ({env, options, payload}, koenigOptions) => {
                let cardName = env.name;
                let componentName = CARD_COMPONENT_MAP[cardName];

                // the payload must be copied to avoid sharing the reference
                payload = copy(payload, true);

                // all of the properties that will be passed through to the
                // component cards via the template
                let card = EmberObject.create({
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

                // the desination element is the container that gets rendered
                // inside the editor, once rendered we use {{-in-element}} to
                // wormhole in the actual ember component
                let cardId = guidFor(card);
                let destinationElementId = `koenig-editor-card-${cardId}`;
                let destinationElement = document.createElement('div');
                destinationElement.id = destinationElementId;

                card.setProperties({
                    destinationElementId,
                    destinationElement
                });

                // after render we render the full ember card via {{-in-element}}
                run.schedule('afterRender', () => {
                    this.componentCards.pushObject(card);
                });

                // render the destination element inside the editor
                return {card, element: destinationElement};
            },
            // triggered when a card section is removed from the mobiledoc
            [REMOVE_CARD_HOOK]: (card) => {
                this.componentCards.removeObject(card);
            }
        };
        editorOptions.cardOptions = componentHooks;

        editor = new Editor(editorOptions);

        // set up key commands and text expansions (MD conversion)
        // TODO: this will override any passed in options, we should allow the
        // default behaviour to be overridden by addon consumers
        registerKeyCommands(editor, this);
        registerTextExpansions(editor, this);

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

        if (this.isEditingDisabled) {
            editor.disableEditing();
        }

        this.set('editor', editor);
        this.didCreateEditor(editor);
    },

    didInsertElement() {
        this._super(...arguments);
        let editorElement = this.element.querySelector('[data-kg="editor"]');

        this._pasteHandler = run.bind(this, this.handlePaste);
        editorElement.addEventListener('paste', this._pasteHandler);
    },

    // our ember component has rendered, now we need to render the mobiledoc
    // editor itself if necessary
    didRender() {
        this._super(...arguments);
        let editor = this.editor;
        if (!editor.hasRendered) {
            let editorElement = this.element.querySelector('[data-kg="editor"]');
            this._isRenderingEditor = true;
            editor.render(editorElement);
            this._isRenderingEditor = false;
        }
    },

    willDestroyElement() {
        let editor = this.editor;
        let editorElement = this.element.querySelector('[data-kg="editor"]');

        editorElement.removeEventListener('paste', this._pasteHandler);
        editor.destroy();
        this._super(...arguments);
    },

    actions: {
        toggleMarkup(markupTagName, postEditor) {
            (postEditor || this.editor).toggleMarkup(markupTagName);
        },

        toggleSection(sectionTagName, postEditor) {
            (postEditor || this.editor).toggleSection(sectionTagName);
        },

        toggleHeaderSection(headingTagName, postEditor) {
            let editor = this.editor;

            // skip toggle if we already have the same heading level
            if (editor.activeSection.tagName === headingTagName) {
                return;
            }

            let operation = function (postEditor) {
                // strip all formatting aside from links
                postEditor.removeMarkupFromRange(
                    editor.activeSection.toRange(),
                    m => m.tagName !== 'a'
                );

                postEditor.toggleSection(headingTagName);
            };

            this._performEdit(operation, postEditor);
        },

        replaceWithCardSection(cardName, range) {
            let editor = this.editor;
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
                let card = this.componentCards.lastObject;
                if (card.koenigOptions.hasEditMode) {
                    this.editCard(card);
                } else if (card.koenigOptions.selectAfterInsert) {
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
            let linkMarkup = getLinkMarkupFromRange(range);
            if ((!range.isCollapsed || linkMarkup) && range.headSection.isMarkerable) {
                this.set('linkRange', range);
            }
        },

        cancelEditLink() {
            this.set('linkRange', null);
        },

        deleteCard(card, cursorMovement = NO_CURSOR_MOVEMENT) {
            this.deleteCard(card, cursorMovement);
        },

        moveCursorToPrevSection(card) {
            let section = this.getSectionFromCard(card);

            if (section.prev) {
                this.deselectCard(card);
                this.moveCaretToTailOfSection(section.prev, false);
            }
        },

        moveCursorToNextSection(card) {
            let section = this.getSectionFromCard(card);

            if (section.next) {
                this.deselectCard(card);
                this.moveCaretToHeadOfSection(section.next, false);
            } else {
                this.send('addParagraphAfterCard', card);
            }
        },

        addParagraphAfterCard(card) {
            let editor = this.editor;
            let section = this.getSectionFromCard(card);
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

    /* mobiledoc event handlers --------------------------------------------- */

    postDidChange(editor) {
        let serializeVersion = this.serializeVersion;
        let updatedMobiledoc = editor.serialize(serializeVersion);
        this._localMobiledoc = updatedMobiledoc;

        // trigger closure action
        this.onChange(updatedMobiledoc);
    },

    cursorDidChange(editor) {
        let {head, tail, direction, isCollapsed, head: {section}} = editor.range;

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
        if (this.selectedCard && this.selectedCard.postModel === section) {
            return;
        }

        // select the card if the cursor is on the before/after &zwnj; char
        if (section && isCollapsed && section.type === 'card-section') {
            if (head.offset === 0 || head.offset === 1) {
                // select card after render to ensure that our componentCards
                // attr is populated
                run.schedule('afterRender', this, () => {
                    let card = this.getCardFromSection(section);
                    this.selectCard(card);
                    this.set('selectedRange', editor.range);
                });
                return;
            }
        }

        // deselect any selected card because the cursor is no longer on a card
        if (this.selectedCard && !editor.range.isBlank) {
            this.deselectCard(this.selectedCard);
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

        // do not include the tail section if it's offset is 0
        // fixes triple-click unexpectedly selecting two sections for section-level formatting
        // https://github.com/bustle/mobiledoc-kit/issues/597
        if (direction === 1 && !isCollapsed && tail.offset === 0) {
            let finalSection = tail.section.prev;
            let newRange = new MobiledocRange(head, finalSection.tailPosition());

            return editor.run((postEditor) => {
                postEditor.setRange(newRange);
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

    /* custom event handlers ------------------------------------------------ */

    // if a URL is pasted and we have a selection, make that selection a link
    handlePaste(event) {
        let editor = this.editor;
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

    /* Ember event handlers ------------------------------------------------- */

    // disable dragging
    // TODO: needs testing for how this interacts with cards that have drag behaviour
    dragStart(event) {
        event.preventDefault();
    },

    /* public methods ------------------------------------------------------- */

    selectCard(card, isEditing = false) {
        // no-op if card is already selected
        if (card === this.selectedCard && isEditing === card.isEditing) {
            return;
        }

        // deselect any already selected card
        if (this.selectedCard && card !== this.selectedCard) {
            this.deselectCard(this.selectedCard);
        }

        // setting a card as selected trigger's the cards didReceiveAttrs
        // hook where the actual selection state change happens. Put into edit
        // mode if necessary
        card.setProperties({
            isEditing,
            isSelected: true
        });
        this.selectedCard = card;

        // hide the cursor and place it after the card so that ENTER can
        // create a new paragraph and cursorDidExitAtTop gets fired on LEFT
        // if the card is at the top of the document
        this._hideCursor();
        let section = this.getSectionFromCard(card);
        this.moveCaretToTailOfSection(section);
    },

    editCard(card) {
        // no-op if card is already being edited
        if (card === this.selectedCard && card.isEditing) {
            return;
        }

        // select the card with edit mode
        this.selectCard(card, true);
    },

    deselectCard(card) {
        card.set('isEditing', false);
        card.set('isSelected', false);
        this.selectedCard = null;
        this._showCursor();
    },

    deleteCard(card, cursorDirection) {
        this.editor.run((postEditor) => {
            let section = card.env.postModel;
            let nextPosition;

            if (cursorDirection === CURSOR_BEFORE) {
                nextPosition = section.prev && section.prev.tailPosition();
            } else {
                nextPosition = section.next && section.next.headPosition();
            }

            postEditor.removeSection(section);

            // if there's no prev or next section then the doc is empty, we want
            // to add a blank paragraph and place the cursor in it
            if (cursorDirection !== NO_CURSOR_MOVEMENT && !nextPosition) {
                let {builder} = postEditor;
                let newPara = builder.createMarkupSection('p');
                postEditor.insertSectionAtEnd(newPara);
                return postEditor.setRange(newPara.tailPosition());
            }

            if (cursorDirection !== NO_CURSOR_MOVEMENT) {
                return postEditor.setRange(nextPosition);
            }
        });
    },

    getCardFromSection(section) {
        if (!section || section.type !== 'card-section') {
            return;
        }

        let cardId = section.renderNode.element.querySelector('.__mobiledoc-card').firstChild.id;

        return this.componentCards.findBy('destinationElementId', cardId);
    },

    getSectionFromCard(card) {
        return card.env.postModel;
    },

    moveCaretToHeadOfSection(section, skipCursorChange = true) {
        this.moveCaretToSection(section, 'head', skipCursorChange);
    },

    moveCaretToTailOfSection(section, skipCursorChange = true) {
        this.moveCaretToSection(section, 'tail', skipCursorChange);
    },

    moveCaretToSection(section, position, skipCursorChange = true) {
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

    /* internal methods ----------------------------------------------------- */

    // nested editor.run loops will create additional undo steps so this is a
    // shortcut for when we already have a postEditor
    _performEdit(editOperation, postEditor) {
        if (postEditor) {
            editOperation(postEditor);
        } else {
            this.editor.run((postEditor) => {
                editOperation(postEditor);
            });
        }
    },

    _hideCursor() {
        this.editor.element.style.caretColor = 'transparent';
    },

    _showCursor() {
        this.editor.element.style.caretColor = 'auto';
    },

    // store a reference to the editor for the acceptance test helpers
    _setExpandoProperty(editor) {
        let config = getOwner(this).resolveRegistration('config:environment');
        if (this.element && config.environment === 'test') {
            this.element[TESTING_EXPANDO_PROPERTY] = editor;
        }
    }
});
