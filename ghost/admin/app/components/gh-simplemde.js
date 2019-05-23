/* global SimpleMDE */
import TextArea from '@ember/component/text-area';
import config from 'ghost-admin/config/environment';
import {assign} from '@ember/polyfills';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default TextArea.extend({
    lazyLoader: service(),

    // Public attributes
    autofocus: false,
    options: null,
    value: null,
    placeholder: '',

    // Private
    _editor: null,

    // Closure actions
    onChange() {},
    onEditorInit() {},
    onEditorDestroy() {},

    // default SimpleMDE options, see docs for available config:
    // https://github.com/sparksuite/simplemde-markdown-editor#configuration
    defaultOptions: computed(function () {
        return {
            autofocus: this.autofocus,
            indentWithTabs: false,
            placeholder: this.placeholder,
            tabSize: 4
        };
    }),

    init() {
        this._super(...arguments);

        if (isEmpty(this.options)) {
            this.set('options', {});
        }
    },

    // update the editor when the value property changes from the outside
    didReceiveAttrs() {
        this._super(...arguments);

        if (isEmpty(this._editor)) {
            return;
        }

        // compare values before forcing a content reset to avoid clobbering
        // the undo behaviour
        if (this.value !== this._editor.value()) {
            let cursor = this._editor.codemirror.getDoc().getCursor();
            this._editor.value(this.value);
            this._editor.codemirror.getDoc().setCursor(cursor);
        }
    },

    // instantiate the editor with the contents of value
    didInsertElement() {
        this._super(...arguments);
        this.initSimpleMDE.perform();
    },

    willDestroyElement() {
        this._editor.toTextArea();
        delete this._editor;
        this._super(...arguments);
    },

    initSimpleMDE: task(function* () {
        yield this.lazyLoader.loadScript('simplemde', 'assets/simplemde/simplemde.js');

        let editorOptions = assign(
            {element: document.getElementById(this.elementId)},
            this.defaultOptions,
            this.options
        );

        // disable spellchecker when testing so that the exterally loaded plugin
        // doesn't fail
        if (config.environment === 'test') {
            editorOptions.spellChecker = false;
        }

        this._editor = new SimpleMDE(editorOptions);
        this._editor.value(this.value || '');

        this._editor.codemirror.on('change', (instance, changeObj) => {
            // avoid a "modified x twice in a single render" error that occurs
            // when the underlying value is completely swapped out
            if (changeObj.origin !== 'setValue') {
                this.onChange(this._editor.value());
            }
        });

        this._editor.codemirror.on('focus', () => {
            this.onFocus();
        });

        this._editor.codemirror.on('blur', () => {
            this.onBlur();
        });

        if (this.autofocus) {
            this._editor.codemirror.execCommand('goDocEnd');
        }

        this.onEditorInit(this._editor);
    })
});
