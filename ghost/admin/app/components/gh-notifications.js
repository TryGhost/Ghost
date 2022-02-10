import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {alias} from '@ember/object/computed';
import {classNames, tagName} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@classic
@tagName('aside')
@classNames('gh-notifications')
export default class GhNotifications extends Component {
    @service notifications;

    @alias('notifications.notifications')
        messages;
}
