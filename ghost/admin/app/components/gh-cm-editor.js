/* global CodeMirror */
import Ember from 'ember';

export default Ember.Component.extend({

    // DOM stuff
    classNameBindings: ['isFocused:focused'],
    isFocused: false,

    value: '', // make sure a value exists
    editor: null, // reference to CodeMirror editor

    // options for the editor
    lineNumbers: true,
    indentUnit: 4,
    mode: 'htmlmixed',
    theme: 'xq-light',

    didInsertElement: function () {
        var options = this.getProperties('lineNumbers', 'indentUnit', 'mode', 'theme'),
            editor = new CodeMirror(this.get('element'), options);

        editor.getDoc().setValue(this.get('value'));

        // events
        editor.on('focus', Ember.run.bind(this, 'set', 'isFocused', true));
        editor.on('blur', Ember.run.bind(this, 'set', 'isFocused', false));
        editor.on('change', () => {
            Ember.run(this, function () {
                this.set('value', editor.getDoc().getValue());
            });
        });

        this.set('editor', editor);
    },

    willDestroyElement: function () {
        var editor = this.get('editor').getWrapperElement();
        editor.parentNode.removeChild(editor);
        this.set('editor', null);
    }

});
