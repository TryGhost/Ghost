import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import editorShortcuts from 'ghost/utils/editor-shortcuts';

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

    shortcuts: editorShortcuts,

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
    }
});

export default EditorRouteBase;
