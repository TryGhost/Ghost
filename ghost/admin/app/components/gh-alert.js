import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhAlert extends Component {
    @service notifications;

    get typeClass() {
        const typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'blue',
            info: 'blue'
        };

        const type = this.args.message.type;

        let classes = '';
        if (typeMapping[type] !== undefined) {
            classes += `gh-alert-${typeMapping[type]}`;
        }

        return classes;
    }

    @action
    closeNotification() {
        this.notifications.closeNotification(this.args.message);
    }
}
