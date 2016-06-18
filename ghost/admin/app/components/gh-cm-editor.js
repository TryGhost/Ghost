/* global CodeMirror */
import Ember from 'ember';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {InvokeActionMixin} from 'ember-invoke-action';

const {Component, run} = Ember;
const {bind} = run;

const CmEditorComponent =  Component.extend(InvokeActionMixin, {
    classNameBindings: ['isFocused:focused'],

    _value: boundOneWay('value'), // make sure a value exists
    isFocused: false,

    // options for the editor
    lineNumbers: true,
    indentUnit: 4,
    mode: 'htmlmixed',
    theme: 'xq-light',

    _editor: null, // reference to CodeMirror editor

    didInsertElement() {
        this._super(...arguments);

        let options = this.getProperties('lineNumbers', 'indentUnit', 'mode', 'theme');
        let editor = new CodeMirror(this.element, options);

        editor.getDoc().setValue(this.get('_value'));

        // events
        editor.on('focus', bind(this, 'set', 'isFocused', true));
        editor.on('blur', bind(this, 'set', 'isFocused', false));
        editor.on('change', () => {
            run(this, function () {
                this.invokeAction('update', editor.getDoc().getValue());
            });
        });

        this._editor = editor;
    },

    willDestroyElement() {
        this._super(...arguments);

        let editor = this._editor.getWrapperElement();
        editor.parentNode.removeChild(editor);
        this._editor = null;
    }
});

CmEditorComponent.reopenClass({
    positionalParams: ['value']
});

export default CmEditorComponent;
