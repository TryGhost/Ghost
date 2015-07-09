import Ember from 'ember';
import ShortcutsRoute from 'ghost/mixins/shortcuts-route';
import styleBody from 'ghost/mixins/style-body';
import editorShortcuts from 'ghost/utils/editor-shortcuts';

var EditorBaseRoute = Ember.Mixin.create(styleBody, ShortcutsRoute, {
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

        // The actual functionality is implemented in utils/ed-editor-shortcuts
        editorShortcut: function (options) {
            // Only fire editor shortcuts when the editor has focus.
            if (this.get('controller.editor').$().is(':focus')) {
                this.get('controller.editor').shortcut(options.type);
            }
        },

        willTransition: function (transition) {
            var controller = this.get('controller'),
                scratch = controller.get('model.scratch'),
                controllerIsDirty = controller.get('isDirty'),
                model = controller.get('model'),
                state = model.getProperties('isDeleted', 'isSaving', 'isDirty', 'isNew'),
                fromNewToEdit,
                deletedWithoutChanges;

            // if a save is in-flight we don't know whether or not it's safe to leave
            // so we abort the transition and retry after the save has completed.
            if (state.isSaving) {
                transition.abort();
                return Ember.run.later(this, function () {
                    Ember.RSVP.resolve(controller.get('lastPromise')).then(function () {
                        transition.retry();
                    });
                }, 100);
            }

            fromNewToEdit = this.get('routeName') === 'editor.new' &&
                transition.targetName === 'editor.edit' &&
                transition.intent.contexts &&
                transition.intent.contexts[0] &&
                transition.intent.contexts[0].id === model.get('id');

            deletedWithoutChanges = state.isDeleted &&
                (state.isSaving || !state.isDirty);

            if (!fromNewToEdit && !deletedWithoutChanges && controllerIsDirty) {
                transition.abort();
                this.send('openModal', 'leave-editor', [controller, transition]);
                return;
            }

            // The controller may hold model state that will be lost in the transition,
            // so we need to apply it now.
            if (fromNewToEdit && controllerIsDirty) {
                if (scratch !== model.get('markdown')) {
                    model.set('markdown', scratch);
                }
            }

            if (state.isNew) {
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
        model.set('scratch', model.get('markdown'));
        model.set('titleScratch', model.get('title'));

        this._super(controller, model);
        var tags = model.get('tags');

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
