/* global CodeMirror */
import Ember from 'ember';

var CodeMirrorEditor = Ember.Component.extend({

    // DOM stuff
    classNameBindings: ['isFocused:focused'],
    isFocused: false,

    value: '', // make sure a value exists
    editor: null, // reference to CodeMirror editor

    // list of default options
    options: {
        lineNumbers: true,
        indentUnit: 4,
        mode: 'htmlmixed',
        theme: 'base16-light'
    },

    didInsertElement: function () {
        var options = this.get('options'),
            self = this,
            editor;
        editor = new CodeMirror(this.get('element'), options);
        editor.getDoc().setValue(this.get('value'));

        // events
        editor.on('focus', function () {
            self.set('isFocused', true);
        });
        editor.on('blur', function () {
            self.set('isFocused', false);
        });
        editor.on('change', function () {
            self.set('value', editor.getDoc().getValue());
        });

        this.set('editor', editor);
    },

    willDestroyElement: function () {
        var editor = this.get('editor').getWrapperElement();
        editor.parentNode.removeChild(editor);
        this.set('editor', null);
    }

});

export default CodeMirrorEditor;
