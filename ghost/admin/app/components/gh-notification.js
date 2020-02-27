import Component from '@ember/component';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend({
    notifications: service(),

    tagName: 'article',
    classNames: ['gh-notification', 'gh-notification-passive'],
    classNameBindings: ['typeClass'],

    message: null,

    typeClass: computed('message.type', function () {
        let type = this.get('message.type');
        let classes = '';
        let typeMapping;

        typeMapping = {
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

        this._animationEndHandler = run.bind(this, function () {
            if (event.animationName === 'fade-out') {
                this.notifications.closeNotification(this.message);
            }
        });

        this.element.addEventListener('animationend', this._animationEndHandler);
    },

    willDestroyElement() {
        this._super(...arguments);
        this.element.removeEventListener('animationend', this._animationEndHandler);
    },

    actions: {
        closeNotification() {
            this.notifications.closeNotification(this.message);
        }
    }
});
