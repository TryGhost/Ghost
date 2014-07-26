import base from 'ghost/mixins/editor-route-base';

var EditorNewRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, base, {
    classNames: ['editor'],

    model: function () {
        var self = this;
        return this.get('session.user').then(function (user) {
            return self.store.createRecord('post', {
                author: user
            });
        });
    },

    setupController: function (controller, model) {
        this._super(controller, model);
        controller.set('scratch', '');

        // used to check if anything has changed in the editor
        controller.set('previousTagNames', Ember.A());

        // attach model-related listeners created in editor-route-base
        this.attachModelHooks(controller, model);
    },

    actions: {
        willTransition: function (transition) {
            var controller = this.get('controller'),
                isDirty = controller.get('isDirty'),

                model = controller.get('model'),
                isNew = model.get('isNew'),
                isSaving = model.get('isSaving'),
                isDeleted = model.get('isDeleted'),
                modelIsDirty = model.get('isDirty');

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

            // remove model-related listeners created in editor-route-base
            this.detachModelHooks(controller, model);
        }
    }
});

export default EditorNewRoute;
