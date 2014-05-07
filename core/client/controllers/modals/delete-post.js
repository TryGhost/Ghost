/*global alert */

var DeletePostController = Ember.Controller.extend({
    confirm: {
        accept: {
            func: function () {
                // @TODO: make this real
                alert('Deleting post');
                // self.model.destroy({
                //     wait: true
                // }).then(function () {
                //     // Redirect to content screen if deleting post from editor.
                //     if (window.location.pathname.indexOf('editor') > -1) {
                //         window.location = Ghost.paths.subdir + '/ghost/content/';
                //     }
                //     Ghost.notifications.addItem({
                //         type: 'success',
                //         message: 'Your post has been deleted.',
                //         status: 'passive'
                //     });
                // }, function () {
                //     Ghost.notifications.addItem({
                //         type: 'error',
                //         message: 'Your post could not be deleted. Please try again.',
                //         status: 'passive'
                //     });
                // });
            },
            text: "Delete",
            buttonClass: "button-delete"
        },
        reject: {
            func: function () {
                return true;
            },
            text: "Cancel",
            buttonClass: "button"
        }
    },
});

export default DeletePostController;
