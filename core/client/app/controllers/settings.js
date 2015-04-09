import Ember from 'ember';
var SettingsController = Ember.Controller.extend({

    showGeneral: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') || this.get('session.user.isEditor') ? false : true;
    }),
    showUsers: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') ? false : true;
    }),
    showTags: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') ? false : true;
    }),
    showNavigation: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') || this.get('session.user.isEditor') ? false : true;
    }),
    showCodeInjection: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') || this.get('session.user.isEditor') ? false : true;
    }),
    showLabs: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor')  || this.get('session.user.isEditor') ? false : true;
    }),
    showAbout: Ember.computed('session.user.name', function () {
        return this.get('session.user.isAuthor') ? false : true;
    })
});

export default SettingsController;
