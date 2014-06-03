/*global alert */

var DeleteAllController = Ember.Controller.extend({
    actions: {
        confirmAccept: function () {
            alert('Deleting everything!');

            this.notifications.showSuccess('Everything has been deleted.');
        },

        confirmReject: function () {
            return true;
        }
    },

    confirm: {
        accept: {
            text: 'Delete',
            buttonClass: 'button-delete'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'button'
        }
    }
});

export default DeleteAllController;
