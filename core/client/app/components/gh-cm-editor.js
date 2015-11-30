/* global CodeMirror */
import Ember from 'ember';

const {Component} = Ember;

export default Component.extend({
    classNameBindings: ['isFocused:focused'],

    value: '', // make sure a value exists
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
        let editor = new CodeMirror(this.get('element'), options);

        editor.getDoc().setValue(this.get('value'));

        // events
        editor.on('focus', Ember.run.bind(this, 'set', 'isFocused', true));
        editor.on('blur', Ember.run.bind(this, 'set', 'isFocused', false));
        editor.on('change', () => {
            Ember.run(this, function () {
                this.set('value', editor.getDoc().getValue());
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
