import * as softReturnParser from '@tryghost/kg-parser-plugins/lib/cards/softReturn';
import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import classic from 'ember-classic-decorator';
import cleanTextReplacementHtml from '../lib/clean-text-replacement-html';
import defaultAtoms from '../options/atoms';
import registerKeyCommands, {TEXT_REPLACEMENT_KEY_COMMANDS} from '../options/key-commands';
import validator from 'validator';
import {BLANK_DOC, MOBILEDOC_VERSION} from './koenig-editor';
import {DRAG_DISABLED_DATA_ATTR} from '../lib/dnd/constants';
import {action, computed} from '@ember/object';
import {arrayToMap} from './koenig-editor';
import {assign} from '@ember/polyfills';
import {getContentFromPasteEvent} from 'mobiledoc-kit/utils/parse-utils';
import {getLinkMarkupFromRange} from '../utils/markup-utils';
import {registerTextReplacementTextExpansions} from '../options/text-expansions';
import {run} from '@ember/runloop';

export function formatTextReplacementHtml(html) {
    return (html || '').replace(/\{(.*?)\}/g, '<code>$&</code>');
}

// TODO: extract core to share functionality between this and `{{koenig-editor}}`

const UNDO_DEPTH = 50;

// markups that should not be continued when typing and reverted to their
// text expansion style when backspacing over final char of markup
const SPECIAL_MARKUPS = {
    S: '~~',
    CODE: {
        char: '{', // this is different because we use <code> to represent {} replacements
        replace: false
    },
    SUP: '^',
    SUB: '~'
};

// if the cursor is at the end of one of our "special" markups that can only be
// toggled via markdown expansions then we want to ensure that the markup is
// removed from the edit state so that you can type without being stuck with
// the special formatting
function toggleSpecialFormatEditState(editor) {
    let {head, isCollapsed} = editor.range;
    if (isCollapsed) {
        Object.keys(SPECIAL_MARKUPS).forEach((tagName) => {
            tagName = tagName.toLowerCase();
            if (head.marker && head.marker.hasMarkup(tagName) && editor._editState.activeMarkups.findBy('tagName', tagName)) {
                let nextMarker = head.markerIn(1);
                if (!nextMarker || !nextMarker.hasMarkup(tagName)) {
                    // there is a bug somehwhere that means after pasting
                    // content the _editState can end up with multiple
                    // instances of the markup so we need to toggle all of them
                    editor._editState.activeMarkups.filterBy('tagName', tagName).forEach((markup) => {
                        editor._editState.toggleMarkupState(markup);
                    });
                }
            }
        });
    }
}

@classic
export default class KoenigTextReplacementHtmlInput extends Component {
    // public attrs
    autofocus = false;
    html = null;
    placeholder = '';
    spellcheck = true;

    // internal properties
    activeMarkupTagNames = null;
    editor = null;
    linkRange = null;
    mobiledoc = null;
    selectedRange = null;

    // private properties
    _hasFocus = false;
    _lastMobiledoc = null;
    _startedRunLoop = false;

    // closure actions
    willCreateEditor() {}
    didCreateEditor() {}
    onChange() {}
    onFocus() {}
    onBlur() {}

    /* computed properties -------------------------------------------------- */

    @computed('html')
    get formattedHtml() {
        return formatTextReplacementHtml(this.html);
    }

    // merge in named options with any passed in `options` property data-bag
    @computed('formattedHtml')
    get editorOptions() {
        let options = this.options || {};
        let atoms = this.atoms || [];
        let cards = this.cards || [];

        // add our default atoms and cards, we want the defaults to be first so
        // that they can be overridden by any passed-in atoms or cards.
        // Use Array.concat to avoid modifying any passed in array references
        atoms = defaultAtoms.concat(atoms);

        return assign({
            html: this.formattedHtml || '',
            placeholder: this.placeholder,
            spellcheck: this.spellcheck,
            autofocus: this.autofocus,
            cards,
            atoms,
            unknownCardHandler() {},
            unknownAtomHandler() {}
        }, options);
    }

    /* lifecycle hooks ------------------------------------------------------ */

    init() {
        super.init(...arguments);
        this.SPECIAL_MARKUPS = SPECIAL_MARKUPS;
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        // reset local mobiledoc if html has been changed upstream so that
        // the html will be re-parsed by the mobiledoc-kit editor
        if (this.html !== this._lastHtml && this.html !== this.getCleanHTML()) {
            this.set('mobiledoc', null);
        }
        this._lastHtml = this.html;
    }

    willRender() {
        super.willRender(...arguments);

        let mobiledoc = this.mobiledoc;

        if (!mobiledoc && !this.formattedHtml) {
            mobiledoc = BLANK_DOC;
        }

        let mobiledocIsSame =
            (this._lastMobiledoc && this._lastMobiledoc === mobiledoc);
        let isEditingDisabledIsSame =
            this._lastIsEditingDisabled === this.isEditingDisabled;

        // no change to mobiledoc, no need to recreate the editor
        if (mobiledocIsSame && isEditingDisabledIsSame) {
            return;
        }

        // update our internal references
        this._lastIsEditingDisabled = this.isEditingDisabled;

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
        editorOptions.parserPlugins = [softReturnParser.fromBr()];

        editor = new Editor(editorOptions);

        registerKeyCommands(editor, this, TEXT_REPLACEMENT_KEY_COMMANDS);
        registerTextReplacementTextExpansions(editor, this);

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

        editor.didUpdatePost((postEditor) => {
            run.join(() => {
                this.didUpdatePost(postEditor);
            });
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

        // update mobiledoc reference to match initial editor state from parsed
        // html. We use this value to compare on re-renders in case we need to
        // re-parse from html
        this.mobiledoc = editor.serialize(MOBILEDOC_VERSION);
        this._lastMobiledoc = this.mobiledoc;

        this.set('editor', editor);
        this.didCreateEditor(editor);
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        let editorElement = this.element.querySelector('[data-kg="editor"]');

        this._pasteHandler = run.bind(this, this.handlePaste);
        editorElement.addEventListener('paste', this._pasteHandler);

        this.element.dataset[DRAG_DISABLED_DATA_ATTR] = 'true';
    }

    // our ember component has rendered, now we need to render the mobiledoc
    // editor itself if necessary
    didRender() {
        super.didRender(...arguments);
        let {editor} = this;
        if (!editor.hasRendered) {
            let editorElement = this.element.querySelector('[data-kg="editor"]');
            this._isRenderingEditor = true;
            editor.render(editorElement);
            this._isRenderingEditor = false;
        }
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);

        let editorElement = this.element.querySelector('[data-kg="editor"]');
        editorElement.removeEventListener('paste', this._pasteHandler);

        this.editor.destroy();
    }

    @action
    toggleMarkup(markupTagName, postEditor) {
        (postEditor || this.editor).toggleMarkup(markupTagName);
    }

    // range should be set to the full extent of the selection or the
    // appropriate <a> markup. If there's a selection when the link edit
    // component renders it will re-select when finished which should
    // trigger the normal toolbar
    @action
    editLink(range) {
        let linkMarkup = getLinkMarkupFromRange(range);
        if ((!range.isCollapsed || linkMarkup) && range.headSection.isMarkerable) {
            this.set('linkRange', range);
        }
    }

    @action
    cancelEditLink() {
        this.set('linkRange', null);
    }

    /* ember event handlers --------------------------------------------------*/

    // handle focusin/focusout at the component level so that we don't trigger blur
    // actions when clicking on toolbar buttons
    focusIn(event) {
        if (!this._hasFocus) {
            this._hasFocus = true;
            run.scheduleOnce('actions', this, this.onFocus, event);
        }
    }

    focusOut(event) {
        if (!event.relatedTarget || !this.element.contains(event.relatedTarget)) {
            this._hasFocus = false;
            run.scheduleOnce('actions', this, this.onBlur, event);
        }
    }

    /* custom event handlers ------------------------------------------------ */

    handlePaste(event) {
        let {editor, editor: {range}} = this;
        let {text} = getContentFromPasteEvent(event);

        if (!editor.cursor.isAddressable(event.target)) {
            return;
        }

        if (text && validator.isURL(text)) {
            // if we have a text selection, make that selection a link
            if (range && !range.isCollapsed && range.headSection === range.tailSection && range.headSection.isMarkerable) {
                let linkMarkup = editor.builder.createMarkup('a', {href: text});
                editor.run((postEditor) => {
                    postEditor.addMarkupToRange(range, linkMarkup);
                });
                editor.selectRange(range.tail);

                // prevent mobiledoc's default paste event handler firing
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
        }
    }

    /* mobiledoc event handlers ----------------------------------------------*/

    // manipulate mobiledoc content before committing changes
    // - only one section
    // - first section must be a markerable section
    // - if first section is a list, grab the content of the first list item
    didUpdatePost(postEditor) {
        let {editor, editor: {post}} = postEditor;

        // remove any other formatting from code formats
        let markers = [];
        try {
            markers = post.markersContainedByRange(post.toRange());
        } catch (e) {
            // post.toRange() can fail if a list item was just removed
            // TODO: mobiledoc-kit bug?
        }
        markers.forEach((marker) => {
            let {markups} = marker;
            if (markups.length > 1 && marker.hasMarkup('code')) {
                markups.rejectBy('tagName', 'code').forEach((markup) => {
                    marker.removeMarkup(markup);
                });
            }
        });

        // remove any non-markerable/non-list sections
        post.sections.forEach((section) => {
            if (!section.isMarkerable && !section.isListSection) {
                let reposition = section === editor.activeSection;
                postEditor.removeSection(section);
                if (reposition) {
                    postEditor.setRange(post.sections.head.tailPosition());
                }
            }
        });
    }

    postDidChange() {
        // trigger closure action
        this.onChange(this.getCleanHTML());
    }

    cursorDidChange(editor) {
        // if we have `code` or ~strike~ formatting to the left but not the right
        // then toggle the formatting - these formats should only be creatable
        // through the text expansions
        toggleSpecialFormatEditState(editor);

        // pass the selected range through to the toolbar + menu components
        this.set('selectedRange', editor.range);
    }

    // fired when the active section(s) or markup(s) at the current cursor
    // position or selection have changed. We use this event to update the
    // activeMarkup/section tag lists which control button states in our popup
    // toolbar
    inputModeDidChange(editor) {
        let markupTags = arrayToMap(editor.activeMarkups.map(m => m.tagName));

        // On keyboard cursor movement our `cursorDidChange` toggle for special
        // formats happens before mobiledoc's readstate updates the edit states
        // so we have to re-do it here
        // TODO: can we make the event order consistent in mobiledoc-kit?
        toggleSpecialFormatEditState(editor);

        // Avoid updating this component's properties synchronously while
        // rendering the editor (after rendering the component) because it
        // causes Ember to display deprecation warnings
        if (this._isRenderingEditor) {
            run.schedule('afterRender', () => {
                this.set('activeMarkupTagNames', markupTags);
            });
        } else {
            this.set('activeMarkupTagNames', markupTags);
        }
    }

    /* private methods -------------------------------------------------------*/

    // rather than parsing mobiledoc to HTML we can grab the HTML directly from
    // inside the editor element because we should only be dealing with
    // inline markup that directly maps to HTML elements
    getCleanHTML() {
        if (this.editor && this.editor.element) {
            return cleanTextReplacementHtml(this.editor.element.innerHTML);
        }
    }
}
