/* global ace */
import Ember from 'ember';

var AceEditor;

AceEditor = Ember.Component.extend({

    value: '', // makes sure value exists

    editor: null, // reference to editor object

    isFocused: false,

    classNameBindings: ['isFocused:focused'],

    mode: 'html',

    // These are some default options for the editor component. See the ace wiki for available options
    options: {
        minLines: 18,
        // after 100 lines a scrollbar will appear. Until that point, the editor will expand vertically
        maxLines: 100,
        showFoldWidgets: false,
        showPrintMargin: false
    },

    theme: 'ace/theme/github',

    update: function () {
        this.set('value', this.get('editor').getValue());
    },

    didInsertElement: function () {
        var editor = ace.edit(this.get('id')),
            self = this;
        editor.getSession().setUseWorker(false); // disable syntax checking
        editor.getSession().setMode('ace/mode/' + this.get('mode'));
        editor.setTheme(this.get('theme'));
        editor.setOptions(this.get('options'));
        editor.insert(this.get('value'));
        editor.container.style.lineHeight = '22px'; // hard coded line height
        editor.on('focus', function () {
            self.set('isFocused', true);
        });
        editor.on('blur', function () {
            self.set('isFocused', false);
        });
        editor.on('change', function () {
            self.update();
        });
        this.set('editor', editor);
    },

    willDestroyElement: function () {
        var editor = this.get('editor');
        editor.destroy();
        editor.container.remove();
        this.set('editor', null);
    }

});

export default AceEditor;
