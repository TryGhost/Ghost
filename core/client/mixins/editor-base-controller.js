/* global console */
import boundOneWay from 'ghost/utils/bound-one-way';

var EditorControllerMixin = Ember.Mixin.create({
    /**
     * By default, a post will not change its publish state.
     * Only with a user-set value (via setSaveType action)
     * can the post's status change.
     */
    willPublish: boundOneWay('isPublished'),
    markdown: Ember.computed.oneWay('model.markdown'),

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
            //Update with content changes
            this.set('model.markdown', this.get('markdown'));
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
