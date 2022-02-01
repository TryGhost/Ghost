import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {classNameBindings, classNames, tagName} from '@ember-decorators/component';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

@classic
@tagName('article')
@classNames('gh-notification', 'gh-notification-passive')
@classNameBindings('typeClass')
export default class GhNotification extends Component {
    @service notifications;

    message = null;

    @computed('message.type')
    get typeClass() {
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
    }

    didInsertElement() {
        super.didInsertElement(...arguments);

        this._animationEndHandler = run.bind(this, function () {
            if (event.animationName === 'fade-out') {
                this.notifications.closeNotification(this.message);
            }
        });

        this.element.addEventListener('animationend', this._animationEndHandler);
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this.element.removeEventListener('animationend', this._animationEndHandler);
    }

    @action
    closeNotification() {
        this.notifications.closeNotification(this.message);
    }
}
