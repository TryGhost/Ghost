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

        // The actual functionality is implemented in utils/codemirror-shortcuts
        codeMirrorShortcut: function (options) {
            this.get('controller.codemirror').shortcut(options.type);
        },

        willTransition: function (transition) {
            var controller = this.get('controller'),
                isDirty = controller.get('isDirty'),

                model = controller.get('model'),
                isSaving = model.get('isSaving'),
                isDeleted = model.get('isDeleted'),
                modelIsDirty = model.get('isDirty');

            this.send('closeSettingsMenu');

            // when `isDeleted && isSaving`, model is in-flight, being saved
            // to the server. when `isDeleted && !isSaving && !modelIsDirty`,
            // the record has already been deleted and the deletion persisted.
            //
            // in either case  we can probably just transition now.
            // in the former case the server will return the record, thereby updating it.
            // @TODO: this will break if the model fails server-side validation.
            if (!(isDeleted && isSaving) && !(isDeleted && !isSaving && !modelIsDirty) && isDirty) {
                transition.abort();
                this.send('openModal', 'leave-editor', [controller, transition]);
                return;
            }
            // since the transition is now certain to complete..
            window.onbeforeunload = null;

            // remove model-related listeners created in editor-base-route
            this.detachModelHooks(controller, model);
            // Bubble the action for the EditorRoute to catch
            return true;
        },

        // Delete empty posts locally, or autosaved posts on the server
        // when leaving the editor route.
        deleteEmptyPosts: function () {
            var model = this.controller.get('model');
            // Delete unsaved, empty records from the store
            if (model.get('isNew')) {
                model.deleteRecord();
                return;
            }
            // A blank, autosaved post - kill it serverside as well.
            if (model.get('title') === '(Untitled)' && !model.get('markdown')) {
                return model.destroyRecord();
            }
        }
    },

    renderTemplate: function (controller, model) {
        this._super();

        this.render('post-settings-menu', {
            into: 'application',
            outlet: 'settings-menu',
            model: model
        });
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
