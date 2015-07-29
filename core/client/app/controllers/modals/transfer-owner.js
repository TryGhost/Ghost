import Ember from 'ember';
import {request as ajax} from 'ic-ajax';

export default Ember.Controller.extend({
    dropdown: Ember.inject.service(),
    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    actions: {
        confirmAccept: function () {
            var user = this.get('model'),
                url = this.get('ghostPaths.url').api('users', 'owner'),
                self = this;

            self.get('dropdown').closeDropdowns();

            ajax(url, {
                type: 'PUT',
                data: {
                    owner: [{
                        id: user.get('id')
                    }]
                }
            }).then(function (response) {
                // manually update the roles for the users that just changed roles
                // because store.pushPayload is not working with embedded relations
                if (response && Ember.isArray(response.users)) {
                    response.users.forEach(function (userJSON) {
                        var user = self.store.getById('user', userJSON.id),
                            role = self.store.getById('role', userJSON.roles[0].id);

                        user.set('role', role);
                    });
                }

                self.get('notifications').showAlert('Ownership successfully transferred to ' + user.get('name'), {type: 'success'});
            }).catch(function (error) {
                self.get('notifications').showAPIError(error);
            });
        },

        confirmReject: function () {
            return false;
        }
    },

    confirm: {
        accept: {
            text: 'Yep - I\'m sure',
            buttonClass: 'btn btn-red'
        },
        reject: {
            text: 'Cancel',
            buttonClass: 'btn btn-default btn-minor'
        }
    }
});
