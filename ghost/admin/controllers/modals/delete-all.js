/*global alert */

var DeleteAllController = Ember.Controller.extend({
    confirm: {
        accept: {
            func: function () {
                // @TODO make the below real :)
                alert('Deleting everything!');
                // $.ajax({
                //     url: Ghost.paths.apiRoot + '/db/',
                //     type: 'DELETE',
                //     headers: {
                //         'X-CSRF-Token': $("meta[name='csrf-param']").attr('content')
                //     },
                //     success: function onSuccess(response) {
                //         if (!response) {
                //             throw new Error('No response received from server.');
                //         }
                //         if (!response.message) {
                //             throw new Error(response.detail || 'Unknown error');
                //         }

                //         Ghost.notifications.addItem({
                //             type: 'success',
                //             message: response.message,
                //             status: 'passive'
                //         });

                //     },
                //     error: function onError(response) {
                //         var responseText = JSON.parse(response.responseText),
                //             message = responseText && responseText.error ? responseText.error : 'unknown';
                //         Ghost.notifications.addItem({
                //             type: 'error',
                //             message: ['A problem was encountered while deleting content from your blog. Error: ', message].join(''),
                //             status: 'passive'
                //         });

                //     }
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
    }
});

export default DeleteAllController;
