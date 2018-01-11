/* global CodeMirror */
import Component from '@ember/component';
import RSVP from 'rsvp';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {InvokeActionMixin} from 'ember-invoke-action';
import {assign} from '@ember/polyfills';
import {bind, once, scheduleOnce} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const CmEditorComponent = Component.extend(InvokeActionMixin, {
    lazyLoader: service(),

    classNameBindings: ['isFocused:focus'],

    isFocused: false,
    isInitializingCodemirror: true,

    // options for the editor
    lineNumbers: true,
    indentUnit: 4,
    mode: 'htmlmixed',
    theme: 'xq-light',

    _editor: null, // reference to CodeMirror editor
    _value: boundOneWay('value'), // make sure a value exists

    didReceiveAttrs() {
        if (this.get('value') === null || undefined) {
            this.set('value', '');
        }
    },

    didInsertElement() {
        this._super(...arguments);
        this.get('initCodeMirror').perform();
    },

    willDestroyElement() {
        this._super(...arguments);

        // Ensure the editor exists before trying to destroy it. This fixes
        // an error that occurs if codemirror hasn't finished loading before
        // the component is destroyed.
        if (this._editor) {
            let editor = this._editor.getWrapperElement();
            editor.parentNode.removeChild(editor);
            this._editor = null;
        }
    },

    actions: {
        updateFromTextarea(value) {
            this.invokeAction('update', value);
        }
    },

    initCodeMirror: task(function* () {
        let loader = this.get('lazyLoader');

        yield RSVP.all([
            loader.loadStyle('codemirror', 'assets/codemirror/codemirror.css'),
            loader.loadScript('codemirror', 'assets/codemirror/codemirror.js')
        ]);

        scheduleOnce('afterRender', this, function () {
            this._initCodeMirror();
        });
    }),

    _initCodeMirror() {
        let options = this.getProperties('lineNumbers', 'indentUnit', 'mode', 'theme', 'autofocus');
        assign(options, {value: this.get('_value')});

        let textarea = this.element.querySelector('textarea');
        if (textarea && textarea === document.activeElement) {
            options.autofocus = true;
        }

        this.set('isInitializingCodemirror', false);
        this._editor = new CodeMirror(this.element, options);

        // by default CodeMirror will place the cursor at the beginning of the
        // content, it makes more sense for the cursor to be at the end
        if (options.autofocus) {
            this._editor.setCursor(this._editor.lineCount(), 0);
        }

        // events
        this._setupCodeMirrorEventHandler('focus', this, this._focus);
        this._setupCodeMirrorEventHandler('blur', this, this._blur);
        this._setupCodeMirrorEventHandler('change', this, this._update);
    },

    _setupCodeMirrorEventHandler(event, target, method) {
        let callback = bind(target, method);

        this._editor.on(event, callback);

        this.one('willDestroyElement', this, function () {
            this._editor.off(event, callback);
        });
    },

    _update(codeMirror, changeObj) {
        once(this, this._invokeUpdateAction, codeMirror.getValue(), codeMirror, changeObj);
    },

    _invokeUpdateAction(...args) {
        this.invokeAction('update', ...args);
    },

    _focus(codeMirror, event) {
        this.set('isFocused', true);
        once(this, this._invokeFocusAction, codeMirror.getValue(), codeMirror, event);
    },

    _invokeFocusAction(...args) {
        this.invokeAction('focus-in', ...args);
    },

    _blur(/* codeMirror, event */) {
        this.set('isFocused', false);
    }
});

CmEditorComponent.reopenClass({
    positionalParams: ['value']
});

export default CmEditorComponent;
