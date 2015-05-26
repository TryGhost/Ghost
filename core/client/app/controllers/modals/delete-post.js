import Ember from 'ember';

export default Ember.Controller.extend({
    dropdown: Ember.inject.service(),
    notifications: Ember.inject.service(),

    actions: {
        confirmAccept: function () {
            var self = this,
                model = this.get('model');

            // definitely want to clear the data store and post of any unsaved, client-generated tags
            model.updateTags();

            model.destroyRecord().then(function () {
                self.get('dropdown').closeDropdowns();
                self.transitionToRoute('posts.index');
                self.get('notifications').showSuccess('Your post has been deleted.', {delayed: true});
            }, function () {
                self.get('notifications').showError('Your post could not be deleted. Please try again.');
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
