import Ember from 'ember';

export default Ember.Controller.extend({
    notifications: Ember.inject.service(),
    application: Ember.inject.controller(),

    postInflection: Ember.computed('model.post_count', function () {
        return this.get('model.post_count') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirmAccept: function () {
            var tag = this.get('model');

            this.send('closeMenus');

            tag.destroyRecord().then(() => {
                let currentRoute = this.get('application.currentRouteName') || '';

                if (currentRoute.match(/^settings\.tags/)) {
                    this.transitionToRoute('settings.tags.index');
                }
            }).catch((error) => {
                this.get('notifications').showAPIError(error, {key: 'tag.delete'});
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
