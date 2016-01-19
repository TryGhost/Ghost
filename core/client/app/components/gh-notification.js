import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: 'article',
    classNames: ['gh-notification', 'gh-notification-passive'],
    classNameBindings: ['typeClass'],

    message: null,

    notifications: service(),

    typeClass: computed('message.type', function () {
        let type = this.get('message.type');
        let classes = '';
        let typeMapping;

        typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'yellow'
        };

        if (typeMapping[type] !== undefined) {
            classes += `gh-notification-${typeMapping[type]}`;
        }

        return classes;
    }),

    didInsertElement() {
        this._super(...arguments);

        this.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', (event) => {
            if (event.originalEvent.animationName === 'fade-out') {
                this.get('notifications').closeNotification(this.get('message'));
            }
        });
    },

    willDestroyElement() {
        this._super(...arguments);
        this.$().off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
    },

    actions: {
        closeNotification() {
            this.get('notifications').closeNotification(this.get('message'));
        }
    }
});
