import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';


var EditorRouteBase = Ember.Mixin.create(styleBody, ShortcutsRoute, loadingIndicator, {
    actions: {
        save: function () {
            this.get('controller').send('save');
        },
        publish: function () {
            var controller = this.get('controller');
            controller.send('setSaveType', 'publish');
            controller.send('save');
        },
        toggleZenMode: function () {
            Ember.$('body').toggleClass('zen');
        },
        //The actual functionality is implemented in utils/codemirror-shortcuts
        codeMirrorShortcut: function (options) {
            this.get('controller.codemirror').shortcut(options.type);
        }
    },

    attachModelHooks: function (controller, model) {
        // this will allow us to track when the model is saved and update the controller
        // so that we can be sure controller.isDirty is correct, without having to update the
        // controller on each instance of `model.save()`.
        //
        // another reason we can't do this on `model.save().then()` is because the post-settings-menu
        // also saves the model, and passing messages is difficult because we have two
        // types of editor controllers, and the PSM also exists on the posts.post route.
        //
        // The reason we can't just keep this functionality in the editor controller is
        // because we need to remove these handlers on `willTransition` in the editor route.
        model.on('didCreate', controller, controller.get('modelSaved'));
        model.on('didUpdate', controller, controller.get('modelSaved'));
    },

    detachModelHooks: function (controller, model) {
        model.off('didCreate', controller, controller.get('modelSaved'));
        model.off('didUpdate', controller, controller.get('modelSaved'));
    },

    shortcuts: {
        //General Editor shortcuts
        'ctrl+s, command+s': 'save',
        'ctrl+alt+p': 'publish',
        'alt+shift+z': 'toggleZenMode',
        //CodeMirror Markdown Shortcuts
        'ctrl+alt+u': {action: 'codeMirrorShortcut', options: {type: 'strike'}},
        'ctrl+alt+1': {action: 'codeMirrorShortcut', options: {type: 'h1'}},
        'ctrl+alt+2': {action: 'codeMirrorShortcut', options: {type: 'h2'}},
        'ctrl+alt+3': {action: 'codeMirrorShortcut', options: {type: 'h3'}},
        'ctrl+alt+4': {action: 'codeMirrorShortcut', options: {type: 'h4'}},
        'ctrl+alt+5': {action: 'codeMirrorShortcut', options: {type: 'h5'}},
        'ctrl+alt+6': {action: 'codeMirrorShortcut', options: {type: 'h6'}},
        'ctrl+shift+i': {action: 'codeMirrorShortcut', options: {type: 'image'}},
        'ctrl+q': {action: 'codeMirrorShortcut', options: {type: 'blockquote'}},
        'ctrl+shift+1': {action: 'codeMirrorShortcut', options: {type: 'currentDate'}},
        'ctrl+b, command+b': {action: 'codeMirrorShortcut', options: {type: 'bold'}},
        'ctrl+i, command+i': {action: 'codeMirrorShortcut', options: {type: 'italic'}},
        'ctrl+k, command+k': {action: 'codeMirrorShortcut', options: {type: 'link'}},
        'ctrl+l': {action: 'codeMirrorShortcut', options: {type: 'list'}},
    /** Currently broken CodeMirror Markdown shortcuts.
      * some may be broken due to a conflict with CodeMirror commands
      *   (see http://codemirror.net/doc/manual.html#commands)
        'ctrl+U': {action: 'codeMirrorShortcut', options: {type: 'uppercase'}},
        'ctrl+shift+U': {action: 'codeMirrorShortcut', options: {type: 'lowercase'}},
        'ctrl+alt+shift+U': {action: 'codeMirrorShortcut', options: {type: 'titlecase'}}
        'ctrl+alt+W': {action: 'codeMirrorShortcut', options: {type: 'selectword'}},
        'ctrl+alt+c': {action: 'codeMirrorShortcut', options: {type: 'copyHTML'}},
        'ctrl+enter': {action: 'codeMirrorShortcut', options: {type: 'newLine'}},
       */
    }
});

export default EditorRouteBase;
