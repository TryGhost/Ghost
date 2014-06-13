/* global console */

var EditorControllerMixin = Ember.Mixin.create({
    //## Computed post properties
    isPublished: Ember.computed.equal('status', 'published'),
    isDraft: Ember.computed.equal('status', 'draft'),
    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: function (key, value) {
        if (arguments.length > 1) {
            return value;
        }
        return this.get('isPublished');
    }.property('isPublished'),

    // remove client-generated tags, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    updateTags: function () {
        var tags = this.get('model.tags'),
        oldTags = tags.filterBy('id', null);

        tags.removeObjects(oldTags);
        oldTags.invoke('deleteRecord');
    },

    actions: {
        save: function () {
            var status = this.get('willPublish') ? 'published' : 'draft',
                self = this;

            this.set('status', status);
            return this.get('model').save().then(function (model) {
                self.updateTags();

                self.notifications.showSuccess('Post status saved as <strong>' +
                    model.get('status') + '</strong>.');
                return model;
            }, this.notifications.showErrors);
        },

        setSaveType: function (newType) {
            if (newType === 'publish') {
                this.set('willPublish', true);
            } else if (newType === 'draft') {
                this.set('willPublish', false);
            } else {
                console.warn('Received invalid save type; ignoring.');
            }
        }
    }
});

export default EditorControllerMixin;
