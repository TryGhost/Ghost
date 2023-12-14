import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhOffersNotification extends Component {
    @service feature;
    @service settings;

    constructor() {
        super(...arguments);
    }

    get isOffersNotificationNotDismissed() {
        return !this.feature.accessibility.offersNotificationDismissed;
    }

    get showOffersNotification() {
        return !this.args.hasThemeErrors && this.isOffersNotificationNotDismissed;
    }

    @action
    dismissOffersNotification(event) {
        event.stopPropagation();

        if (!this.feature.offersNotificationDismissed) {
            this.feature.offersNotificationDismissed = moment().tz(this.settings.timezone);
        }
    }
}
