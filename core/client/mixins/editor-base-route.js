import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import editorShortcuts from 'ghost/utils/editor-shortcuts';

var EditorBaseRoute = Ember.Mixin.create(styleBody, ShortcutsRoute, loadingIndicator, {
    classNames: ['editor'],

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
            // Only fire editor shortcuts when the editor has focus.
            if (Ember.$('.CodeMirror.CodeMirror-focused').length > 0) {
                this.get('controller.codemirror').shortcut(options.type);
            }
        },

        willTransition: function (transition) {
            var controller = this.get('controller'),
                isDirty = controller.get('isDirty'),

                model = controller.get('model'),
                isNew = model.get('isNew'),
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

            if (isNew) {
                model.deleteRecord();
            }

            // since the transition is now certain to complete..
            window.onbeforeunload = null;

            // remove model-related listeners created in editor-base-route
            this.detachModelHooks(controller, model);
        }
    },

    renderTemplate: function (controller, model) {
        this._super(controller, model);

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
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        var tags = model.get('tags');

        controller.set('scratch', model.get('markdown'));

        controller.set('titleScratch', model.get('title'));

        if (tags) {
            // used to check if anything has changed in the editor
            controller.set('previousTagNames', tags.mapBy('name'));
        } else {
            controller.set('previousTagNames', []);
        }

        // attach model-related listeners created in editor-base-route
        this.attachModelHooks(controller, model);
    }
});

export default EditorBaseRoute;
