/* global SimpleMDE */
import Ember from 'ember';
import TextArea from 'ember-components/text-area';
import computed from 'ember-computed';
import {assign} from 'ember-platform';
import {isEmpty} from 'ember-utils';

// ember-cli-shims doesn't export Ember.testing
const {testing} = Ember;

export default TextArea.extend({

    // Public attributes
    autofocus: false,
    options: null,
    value: null,
    placeholder: '',

    // Closure actions
    onChange() {},
    onEditorInit() {},
    onEditorDestroy() {},

    // Private
    _editor: null,

    // default SimpleMDE options, see docs for available config:
    // https://github.com/NextStepWebs/simplemde-markdown-editor#configuration
    defaultOptions: computed(function () {
        return {
            autofocus: this.get('autofocus'),
            indentWithTabs: false,
            placeholder: this.get('placeholder'),
            tabSize: 4
        };
    }),

    init() {
        this._super(...arguments);

        if (isEmpty(this.get('options'))) {
            this.set('options', {});
        }
    },

    // instantiate the editor with the contents of value
    didInsertElement() {
        this._super(...arguments);

        let editorOptions = assign(
            {element: document.getElementById(this.elementId)},
            this.get('defaultOptions'),
            this.get('options')
        );

        // disable spellchecker when testing so that the exterally loaded plugin
        // doesn't fail
        if (testing) {
            editorOptions.spellChecker = false;
        }

        this._editor = new SimpleMDE(editorOptions);
        this._editor.value(this.get('value') || '');

        this._editor.codemirror.on('change', () => {
            this.onChange(this._editor.value());
        });

        if (this.get('autofocus')) {
            this._editor.codemirror.execCommand('goDocEnd');
        }

        this.onEditorInit(this._editor);
    },

    // update the editor when the value property changes from the outside
    didReceiveAttrs() {
        this._super(...arguments);

        if (isEmpty(this._editor)) {
            return;
        }

        // compare values before forcing a content reset to avoid clobbering
        // the undo behaviour
        if (this.get('value') !== this._editor.value()) {
            let cursor = this._editor.codemirror.getDoc().getCursor();
            this._editor.value(this.get('value'));
            this._editor.codemirror.getDoc().setCursor(cursor);
        }
    },

    willDestroyElement()    {
        this.onEditorDestroy();
        this._editor.toTextArea();
        delete this._editor;
        this._super(...arguments);
    }
});
