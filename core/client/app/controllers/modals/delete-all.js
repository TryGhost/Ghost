import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

export default Ember.Controller.extend({
    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    actions: {
        confirmAccept: function () {
            var self = this;

            ajax(this.get('ghostPaths.url').api('db'), {
                type: 'DELETE'
            }).then(function () {
                self.get('notifications').showAlert('All content deleted from database.', {type: 'success'});
                self.store.unloadAll('post');
                self.store.unloadAll('tag');
            }).catch(function (response) {
                self.get('notifications').showAPIError(response);
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: 'Delete',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'btn btn-default btn-minor'
        }
    }
});
