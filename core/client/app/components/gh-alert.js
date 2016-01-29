import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: 'article',
    classNames: ['gh-alert'],
    classNameBindings: ['typeClass'],

    notifications: service(),

    typeClass: computed('message.type', function () {
        let type = this.get('message.type');
        let classes = '';
        let typeMapping;

        typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'yellow',
            info: 'blue'
        };

        if (typeMapping[type] !== undefined) {
            classes += `gh-alert-${typeMapping[type]}`;
        }

        return classes;
    }),

    actions: {
        closeNotification() {
            this.get('notifications').closeNotification(this.get('message'));
        }
    }
});
