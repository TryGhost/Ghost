import Ember from 'ember';

const {Mixin} = Ember;

export default Mixin.create({
    transitionAuthor() {
        return (user) => {
            if (user.get('isAuthor')) {
                return this.transitionTo('team.user', user);
            }

            return user;
        };
    },

    transitionEditor() {
        return (user) => {
            if (user.get('isEditor')) {
                return this.transitionTo('team');
            }

            return user;
        };
    }
});
