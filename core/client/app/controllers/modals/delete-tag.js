import Ember from 'ember';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),

    postInflection: Ember.computed('model.post_count', function () {
        return this.get('model.post_count') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirmAccept: function () {
            var tag = this.get('model'),
                self = this;

            this.send('closeMenus');

            tag.destroyRecord().catch(function (error) {
                self.get('notifications').showAPIError(error);
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
