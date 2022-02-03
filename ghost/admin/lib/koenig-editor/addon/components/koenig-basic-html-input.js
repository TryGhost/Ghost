import * as softReturnParser from '@tryghost/kg-parser-plugins/lib/cards/softReturn';
import Component from '@ember/component';
import Editor from 'mobiledoc-kit/editor/editor';
import classic from 'ember-classic-decorator';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import registerKeyCommands, {BASIC_KEY_COMMANDS, BASIC_KEY_COMMANDS_WITH_BR} from '../options/key-commands';
import validator from 'validator';
import {DRAG_DISABLED_DATA_ATTR} from '../lib/dnd/constants';
import {MOBILEDOC_VERSION, getBlankMobileDoc} from './koenig-editor';
import {action, computed} from '@ember/object';
import {arrayToMap, toggleSpecialFormatEditState} from './koenig-editor';
import {assign} from '@ember/polyfills';
import {getContentFromPasteEvent, parsePostFromPaste} from 'mobiledoc-kit/utils/parse-utils';
import {getLinkMarkupFromRange} from '../utils/markup-utils';
import {registerBasicInputTextExpansions} from '../options/text-expansions';
import {removeBR} from '../options/basic-html-parser-plugins';
import {run} from '@ember/runloop';
import {softReturn as softReturnAtom} from '../options/atoms';

// TODO: extract core to share functionality between this and `{{koenig-editor}}`

const UNDO_DEPTH = 50;

// markups that should not be continued when typing and reverted to their
// text expansion style when backspacing over final char of markup
const SPECIAL_MARKUPS = {
    S: '~~',
    CODE: {
        char: '`',
        replace: false
    },
    SUP: '^',
    SUB: '~'
};

@classic
export default class KoenigBasicHtmlInput extends Component {
    // public attrs
    autofocus = false;
    html = null;
    placeholder = '';
    spellcheck = true;
    defaultTag = 'p';

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
    onNewline() {}
    onFocus() {}
    onBlur() {}

    /* computed properties -------------------------------------------------- */

    @computed('html')
    get cleanHTML() {
        return cleanBasicHtml(this.html || '', {allowBr: !!this.allowBr});
    }

    // merge in named options with any passed in `options` property data-bag
    @computed('cleanHTML')
    get editorOptions() {
        let options = this.options || {};
        let atoms = this.atoms || [];
        let cards = this.cards || [];

        atoms = [softReturnAtom].concat(atoms);

        return assign({
            html: `<${this.defaultTag}>${this.cleanHTML || ''}</${this.defaultTag}>`,
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
        this._lastSetHtml = this.html;
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        // reset local mobiledoc if html has been changed upstream so that
        // the html will be re-parsed by the mobiledoc-kit editor
        if (this._lastSetHtml !== this.html) {
            this.set('mobiledoc', null);
            this._lastSetHtml = this.html;
        }
    }

    willRender() {
        super.willRender(...arguments);

        let mobiledoc = this.mobiledoc;

        if (!mobiledoc && !this.cleanHTML) {
            mobiledoc = getBlankMobileDoc(this.defaultTag);
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

        const parserPlugins = [];
        if (this.allowBr) {
            parserPlugins.push(softReturnParser.fromBr());
        } else {
            parserPlugins.push(removeBR);
        }
        editorOptions.parserPlugins = parserPlugins;

        editor = new Editor(editorOptions);

        registerKeyCommands(editor, this, this.allowBr ? BASIC_KEY_COMMANDS_WITH_BR : BASIC_KEY_COMMANDS);
        registerBasicInputTextExpansions(editor);

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

        editor.willHandleNewline((event) => {
            run.join(() => {
                this.willHandleNewline(event);
            });
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
        // prevent default editor paste, we want to sanitise the pasted post
        // before inserting to avoid disparities arising from `didUpdatePost`
        event.preventDefault();
        event.stopImmediatePropagation();

        let {editor, editor: {range}} = this;

        if (!editor.cursor.isAddressable(event.target)) {
            return;
        }

        if (!range.isCollapsed) {
            editor.performDelete();
        }

        if (editor.post.isBlank) {
            editor._insertEmptyMarkupSectionAtCursor();
        }

        const {text} = getContentFromPasteEvent(event);

        if (text && validator.isURL(text)) {
            // if we have a text selection, make that selection a link
            if (range && !range.isCollapsed && range.headSection === range.tailSection && range.headSection.isMarkerable) {
                let linkMarkup = editor.builder.createMarkup('a', {href: text});
                editor.run((postEditor) => {
                    postEditor.addMarkupToRange(range, linkMarkup);
                });
                editor.selectRange(range.tail);
                return;
            }
        }

        const position = editor.range.head;
        const targetFormat = event.shiftKey ? 'text' : 'html';
        const pastedPost = parsePostFromPaste(event, editor, {targetFormat});

        // Basic HTML post sanitisation - same operations as `didUpdatePost`
        // -----------------------------------------------------------------

        // remove non-markerable and non-list sections
        pastedPost.sections.forEach((section) => {
            if (!section.isMarkerable && !section.isListSection) {
                pastedPost.sections.remove(section);
            }
        });

        // remove all but first section
        while (pastedPost.sections.length > 1) {
            pastedPost.sections.remove(pastedPost.sections.tail);
        }

        // convert first item of list section to a paragraph
        if (pastedPost.sections.head && pastedPost.sections.head.isListSection) {
            let list = pastedPost.sections.head;
            let listItem = list.items.head;
            let newMarkers = listItem.markers.map(m => m.clone());
            let p = editor.builder.createMarkupSection('p', newMarkers);

            pastedPost.sections.remove(list);
            pastedPost.sections.append(p);
        }
        // -----------------------------------------------------------------

        // same as default
        editor.run((postEditor) => {
            const newPosition = postEditor.insertPost(position, pastedPost);
            postEditor.setRange(newPosition);
        });
    }

    /* mobiledoc event handlers ----------------------------------------------*/

    willHandleNewline(event) {
        event.preventDefault();
        this.onNewline();
    }

    // manipulate mobiledoc content before committing changes
    // - only one section
    // - first section must be a markerable section
    // - if first section is a list, grab the content of the first list item
    didUpdatePost(postEditor) {
        let {builder, editor, editor: {post}} = postEditor;

        // NOTE: Update `handlePaste` to match if basic html cleanup operations are changed

        // remove any non-markerable sections
        post.sections.forEach((section) => {
            if (!section.isMarkerable && !section.isListSection) {
                let reposition = section === editor.activeSection;
                postEditor.removeSection(section);
                if (reposition) {
                    postEditor.setRange(post.sections.head.tailPosition());
                }
            }
        });

        // strip all sections other than the first
        if (post.sections.length > 1) {
            while (post.sections.length > 1) {
                postEditor.removeSection(post.sections.tail);
            }
            postEditor.setRange(post.sections.head.tailPosition());
        }

        // convert list section to a paragraph section
        if (post.sections.head && post.sections.head.isListSection) {
            let list = post.sections.head;
            let listItem = list.items.head;
            let newMarkers = listItem.markers.map(m => m.clone());
            let p = builder.createMarkupSection('p', newMarkers);
            postEditor.replaceSection(list, p);
            postEditor.setRange(post.sections.head.tailPosition());
        }

        // convert first section to the expected tag type (might be a heading, blockquote, etc)
        if (post.sections.head) {
            post.sections.head.tagName = this.defaultTag;
        }
    }

    postDidChange() {
        // trigger closure action
        const html = this._getHTML();
        this._lastSetHtml = html;
        this.onChange(html);
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
    _getHTML() {
        if (this.editor && this.editor.element) {
            let firstParagraph = this.editor.element.querySelector(this.defaultTag) || this.editor.element.querySelector('p');

            if (!firstParagraph) {
                return '';
            }

            let html = firstParagraph.innerHTML || '';
            return cleanBasicHtml(html, {allowBr: !!this.allowBr});
        }
    }
}
