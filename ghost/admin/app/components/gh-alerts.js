import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {alias} from '@ember/object/computed';
import {classNames, tagName} from '@ember-decorators/component';
import {inject as service} from '@ember/service';

@classic
@classNames('gh-alerts')
@tagName('aside')
export default class GhAlerts extends Component {
    @service notifications;

    @alias('notifications.alerts')
        messages;
}
