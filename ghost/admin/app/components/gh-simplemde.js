import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* global SimpleMDE */
import TextArea from '@ember/component/text-area';
import config from 'ghost-admin/config/environment';
import {assign} from '@ember/polyfills';
import {isEmpty} from '@ember/utils';
import {task} from 'ember-concurrency';

@classic
export default class GhSimplemde extends TextArea {
    @service lazyLoader;

    // Public attributes
    autofocus = false;

    options = null;
    value = null;
    placeholder = '';

    // Private
    _editor = null;

    // Closure actions
    onChange() {}

    onEditorInit() {}
    onEditorDestroy() {}

    // default SimpleMDE options, see docs for available config:
    // https://github.com/sparksuite/simplemde-markdown-editor#configuration
    @computed
    get defaultOptions() {
        return {
            autofocus: this.autofocus,
            indentWithTabs: false,
            placeholder: this.placeholder,
            tabSize: 4
        };
    }

    init() {
        super.init(...arguments);

        if (isEmpty(this.options)) {
            this.set('options', {});
        }
    }

    // update the editor when the value property changes from the outside
    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

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
    }

    // instantiate the editor with the contents of value
    didInsertElement() {
        super.didInsertElement(...arguments);
        this.initSimpleMDE.perform();
    }

    willDestroyElement() {
        if (this._editor?.codemirror) {
            this._editor.toTextArea();
        }
        delete this._editor;
        super.willDestroyElement(...arguments);
    }

    @task(function* () {
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
        initSimpleMDE;
}
