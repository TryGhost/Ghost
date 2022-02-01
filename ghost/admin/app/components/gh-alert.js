import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {classNameBindings, classNames, tagName} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@classic
@classNameBindings('typeClass')
@classNames('gh-alert')
@tagName('article')
export default class GhAlert extends Component {
    @service notifications;

    @computed('message.type')
    get typeClass() {
        let type = this.get('message.type');
        let classes = '';
        let typeMapping;

        typeMapping = {
            success: 'green',
            error: 'red',
            warn: 'blue',
            info: 'blue'
        };

        if (typeMapping[type] !== undefined) {
            classes += `gh-alert-${typeMapping[type]}`;
        }

        return classes;
    }

    @action
    closeNotification() {
        this.notifications.closeNotification(this.message);
    }
}
