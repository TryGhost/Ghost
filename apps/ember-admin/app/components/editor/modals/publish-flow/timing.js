import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublishFlowTiming extends Component {
    @service settings;

    get isScheduled() {
        return this.args.publishOptions.isScheduled;
    }

    // the scheduled moment in the site's own timezone, spelled out — a UTC
    // offset is not something anyone should have to convert in their head
    get scheduledLabel() {
        const scheduled = moment.tz(this.args.publishOptions.scheduledAtUTC, this.settings.timezone);
        return scheduled.format('dddd D MMMM [at] HH:mm');
    }

    get timezoneLabel() {
        // "Etc/UTC time" is technically right and reads like a machine wrote it
        return (this.settings.timezone || '').replace(/^Etc\//, '');
    }

    @action
    setScheduled(scheduled) {
        this.args.publishOptions.toggleScheduled(scheduled);
    }
}
