import Mixin from '@ember/object/mixin';

export default Mixin.create({
    transitionAuthor() {
        return (user) => {
            if (user.get('isAuthorOrContributor')) {
                return this.transitionTo('staff.user', user);
            }

            return user;
        };
    },

    transitionEditor() {
        return (user) => {
            if (user.get('isEditor')) {
                return this.transitionTo('staff');
            }

            return user;
        };
    }
});
