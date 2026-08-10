import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhNotification extends Component {
    @service notifications;

    get typeClass() {
        const typeMapping = {
            error: 'red',
            warn: 'yellow'
        };

        const type = this.args.message.type;
        let classes = '';
        if (typeMapping[type] !== undefined) {
            classes += `gh-notification-${typeMapping[type]}`;
        }

        return classes;
    }

    @action
    closeOnFadeOut(event) {
        if (event.animationName === 'fade-out') {
            this.closeNotification();
        }
    }

    @action
    closeNotification() {
        this.notifications.closeNotification(this.args.message);
    }
}
