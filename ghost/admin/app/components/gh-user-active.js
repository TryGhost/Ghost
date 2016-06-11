import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service},
    String: {htmlSafe}
} = Ember;

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: service(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return htmlSafe(`background-image: url(${url})`);
    }),

    lastLogin: computed('user.lastLogin', function () {
        let lastLogin = this.get('user.lastLogin');

        return lastLogin ? moment(lastLogin).fromNow() : '(Never)';
    })
});
