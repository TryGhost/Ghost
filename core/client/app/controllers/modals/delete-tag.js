import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({
    application: inject.controller(),
    notifications: inject.service(),

    postInflection: computed('model.count.posts', function () {
        return this.get('model.count.posts') > 1 ? 'posts' : 'post';
    }),

    actions: {
        confirmAccept() {
            let tag = this.get('model');

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

        confirmReject() {
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
