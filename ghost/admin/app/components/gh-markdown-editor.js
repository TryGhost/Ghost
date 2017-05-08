import Component from 'ember-component';
import computed from 'ember-computed';
import {assign} from 'ember-platform';
import {copy} from 'ember-metal/utils';
import {isEmpty} from 'ember-utils';
import run from 'ember-runloop';

const MOBILEDOC_VERSION = '0.3.1';

export const BLANK_DOC = {
    version: MOBILEDOC_VERSION,
    markups: [],
    atoms: [],
    cards: [
        ['card-markdown', {
            cardName: 'card-markdown',
            markdown: ''
        }]
    ],
    sections: [[10, 0]]
};

export default Component.extend({

    // Public attributes
    autofocus: false,
    mobiledoc: null,
    options: null,
    placeholder: '',
    uploadedImageUrls: null,

    // Closure actions
    onChange() {},
    onFullScreen() {},
    showMarkdownHelp() {},

    // Internal attributes
    markdown: null,

    // Private
    _editor: null,
    _isUploading: false,
    _uploadedImageUrls: null,
    _statusbar: null,
    _toolbar: null,

    // Ghost-Specific SimpleMDE toolbar config - allows us to create a bridge
    // between SimpleMDE buttons and Ember actions
    simpleMDEOptions: computed('options', function () {
        let options = this.get('options') || {};
        let defaultOptions = {
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'unordered-list', 'ordered-list', '|',
                'link', 'image', '|',
                'preview', 'side-by-side',
                {
                    name: 'fullscreen',
                    action: () => {
                        this.onFullScreen();
                    },
                    className: 'fa fa-arrows-alt no-disable no-mobile',
                    title: 'Toggle Fullscreen (F11)'
                },
                '|',
                {
                    name: 'guide',
                    action: () => {
                        this.showMarkdownHelp();
                    },
                    className: 'fa fa-question-circle',
                    title: 'Markdown Guide'
                }
            ],
            status: ['words']
        };

        return assign(defaultOptions, options);
    }),

    // extract markdown content from single markdown card
    didReceiveAttrs() {
        this._super(...arguments);
        let mobiledoc = this.get('mobiledoc') || copy(BLANK_DOC, true);

        let uploadedImageUrls = this.get('uploadedImageUrls');
        if (!isEmpty(uploadedImageUrls) && uploadedImageUrls !== this._uploadedImageUrls) {
            this._uploadedImageUrls = uploadedImageUrls;

            // must be done afterRender to avoid double modify of mobiledoc in
            // a single render
            run.scheduleOnce('afterRender', this, () => {
                this._insertImages(uploadedImageUrls);
            });
        }

        // eslint-disable-next-line ember-suave/prefer-destructuring
        let markdown = mobiledoc.cards[0][1].markdown;
        this.set('markdown', markdown);
    },

    _insertImages(urls) {
        let cm = this._editor.codemirror;

        // loop through urls and generate image markdown
        let images = urls.map((url) => {
            return `![](${url})`;
        });
        let text = images.join(' ');

        // focus editor and place cursor at end if not already focused
        if (!cm.hasFocus()) {
            this.send('focusEditor');
        }

        // insert at cursor or replace selection then position cursor at end
        // of inserted text
        cm.replaceSelection(text, 'end');
    },

    actions: {
        // put the markdown into a new mobiledoc card, trigger external update
        updateMarkdown(markdown) {
            let mobiledoc = copy(BLANK_DOC, true);
            mobiledoc.cards[0][1].markdown = markdown;
            this.onChange(mobiledoc);
        },

        // store a reference to the simplemde editor so that we can handle
        // focusing and image uploads
        setEditor(editor) {
            this._editor = editor;

            // disable CodeMirror's drag/drop handling as we want to handle that
            // in the parent gh-editor component
            this._editor.codemirror.setOption('dragDrop', false);

            // HACK: move the toolbar & status bar elements outside of the
            // editor container so that they can be aligned in fixed positions
            let container = this.$().closest('.gh-editor').find('.gh-editor-footer');
            this._toolbar = this.$('.editor-toolbar');
            this._statusbar = this.$('.editor-statusbar');
            this._toolbar.appendTo(container);
            this._statusbar.appendTo(container);
        },

        // put the toolbar/statusbar elements back so that SimpleMDE doesn't throw
        // errors when it tries to remove them
        destroyEditor() {
            let container = this.$();
            this._toolbar.appendTo(container);
            this._statusbar.appendTo(container);
            this._editor = null;
        },

        // used by the title input when the TAB or ENTER keys are pressed
        focusEditor(position = 'bottom') {
            this._editor.codemirror.focus();

            if (position === 'bottom') {
                this._editor.codemirror.execCommand('goDocEnd');
            } else if (position === 'top') {
                this._editor.codemirror.execCommand('goDocStart');
            }

            return false;
        }
    }
});
