var LeaveEditorController = Ember.Controller.extend({
    args: Ember.computed.alias('model'),

    actions: {
        confirmAccept: function () {
            var args = this.get('args'),
                editorController,
                model,
                transition;

            if (Ember.isArray(args)) {
                editorController = args[0];
                transition = args[1];
                model = editorController.get('model');
            }

            // @TODO: throw some kind of error here? return true will send it upward?
            if (!transition || !editorController) {
                return true;
            }

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            editorController.updateTags();

            if (model.get('isNew')) {
                // the user doesn't want to save the new, unsaved post, so delete it.
                model.deleteRecord();
            } else {
                // roll back changes on model props
                model.rollback();
            }

            // setting isDirty to false here allows willTransition on the editor route to succeed
            editorController.set('isDirty', false);

            // since the transition is now certain to complete, we can unset window.onbeforeunload here
            window.onbeforeunload = null;

            transition.retry();
        },

        confirmReject: function () {

        }
    },

    confirm: {
        accept: {
            text: 'Leave',
            buttonClass: 'button-delete'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'button'
        }
    }
});

export default LeaveEditorController;
