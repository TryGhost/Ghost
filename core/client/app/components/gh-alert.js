import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'article',
    classNames: ['gh-alert'],
    classNameBindings: ['typeClass'],

    notifications: Ember.inject.service(),

    typeClass: Ember.computed(function () {
        var classes = '',
            message = this.get('message'),
            type = Ember.get(message, 'type'),
            typeMapping;

        typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'yellow',
            info: 'blue'
        };

        if (typeMapping[type] !== undefined) {
            classes += 'gh-alert-' + typeMapping[type];
        }

        return classes;
    }),

    actions: {
        closeNotification: function () {
            this.get('notifications').closeNotification(this.get('message'));
        }
    }
});
