import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SetupThreeController = Ember.Controller.extend(ValidationEngine, {
    users: '',
    usersArray: Ember.computed('users', function () {
        return this.get('users').split('\n').filter(function (user) {
            return validator.isEmail(user);
        });
    }),
    numUsers: Ember.computed('usersArray', function () {
        return this.get('usersArray').length;
    }),
    buttonText: Ember.computed('numUsers', function () {
        var user = this.get('numUsers') === 1 ? 'user' : 'users';
        return this.get('numUsers') > 0 ?
            'Invite ' + this.get('numUsers') + ' ' + user : 'I\'ll do this later, take me to my blog!';
    }),
    buttonClass: Ember.computed('numUsers', function () {
        return this.get('numUsers') > 0 ? 'btn-green' : 'btn-minor';
    }),
    actions: {
        invite: function () {
            console.log('inviting', this.get('usersArray'));

            if (this.get('numUsers') === 0) {
                this.sendAction('signin');
            }

            // TODO: do invites
        },
        signin: function () {
            var self = this;

            this.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                identification: self.get('email'),
                password: self.get('password')
            });
        }
    }
});

export default SetupThreeController;
