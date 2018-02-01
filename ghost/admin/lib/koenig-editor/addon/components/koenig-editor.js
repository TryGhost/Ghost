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
    'card-markdown': 'koenig-card-markdown' // backwards-compat with markdown editor
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

    // private properties
    _localMobiledoc: null,
    _upstreamMobiledoc: null,
    _startedRunLoop: false,
    _lastIsEditingDisabled: false,
    _isRenderingEditor: false,

    // closure actions
    willCreateEditor() {},
    didCreateEditor() {},
    onChange() {},

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
                    postModel: env.postModel
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

    /* internal methods ----------------------------------------------------- */

    // store a reference to the editor for the acceptance test helpers
    _setExpandoProperty(editor) {
        if (this.element && Ember.testing) {
            this.element[TESTING_EXPANDO_PROPERTY] = editor;
        }
    }
});
