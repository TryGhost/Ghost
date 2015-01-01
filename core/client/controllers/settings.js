var SettingsController = Ember.Controller.extend({
    showGeneral: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') || this.get('session.user.isEditor') ? false : true;
    }),
    showUsers: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') ? false : true;
    }),
    showTags: Ember.computed('session.user.name', 'feature.tagsUI', function () {
        return this.get('session.user.isAuthor') || !this.get('feature.tagsUI') ? false : true;
    }),
    showCodeInjection: Ember.computed('session.user.name', 'feature.codeInjectionUI', function () {
        return this.get('session.user.isAuthor') || this.get('session.user.isEditor') || !this.get('feature.codeInjectionUI') ? false : true;
    }),
    showLabs: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor')  || this.get('session.user.isEditor') ? false : true;
    }),
    showAbout: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') ? false : true;
    })
});

export default SettingsController;
