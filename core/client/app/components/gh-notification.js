import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'article',
    classNames: ['gh-notification', 'gh-notification-passive'],
    classNameBindings: ['typeClass'],

    message: null,

    notifications: Ember.inject.service(),

    typeClass: Ember.computed(function () {
        var classes = '',
            message = this.get('message'),
            type = Ember.get(message, 'type'),
            typeMapping;

        typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'yellow'
        };

        if (typeMapping[type] !== undefined) {
            classes += 'gh-notification-' + typeMapping[type];
        }

        return classes;
    }),

    didInsertElement: function () {
        var self = this;

        self.$().on('animationend webkitAnimationEnd oanimationend MSAnimationEnd', function (event) {
            if (event.originalEvent.animationName === 'fade-out') {
                self.get('notifications').closeNotification(self.get('message'));
            }
        });
    },

    willDestroyElement: function () {
        this.$().off('animationend webkitAnimationEnd oanimationend MSAnimationEnd');
    },

    actions: {
        closeNotification: function () {
            this.get('notifications').closeNotification(this.get('message'));
        }
    }
});
