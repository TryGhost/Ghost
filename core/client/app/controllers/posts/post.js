import Ember from 'ember';

export default Ember.Controller.extend({
    classNameBindings: ['model.featured'],

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    isPublished: Ember.computed.equal('model.status', 'published'),

    authorName: Ember.computed('model.author.name', 'model.author.email', function () {
        return this.get('model.author.name') || this.get('model.author.email');
    }),

    authorAvatar: Ember.computed('model.author.image', function () {
        return this.get('model.author.image') || this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    authorAvatarBackground: Ember.computed('authorAvatar', function () {
        return `background-image: url(${this.get('authorAvatar')})`.htmlSafe();
    }),

    actions: {
        toggleFeatured: function () {
            var notifications = this.get('notifications');

            this.toggleProperty('model.featured');
            this.get('model').save().catch(function (errors) {
                notifications.showErrors(errors);
            });
        },

        showPostContent: function () {
            this.transitionToRoute('posts.post', this.get('model'));
        }
    }
});
