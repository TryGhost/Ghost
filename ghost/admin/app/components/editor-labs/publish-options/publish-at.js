import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublishAtOption extends Component {
    @service settings;

    @action
    setDate(selectedDate) {
        const newDate = moment(this.args.publishOptions.scheduledAtUTC);
        const {year, month, date} = moment(selectedDate).toObject();

        newDate.set({year, month, date});

        this.args.publishOptions.setScheduledAt(newDate);
    }

    @action
    setTime(time, event) {
        const newDate = moment.utc(this.args.publishOptions.scheduledAtUTC);

        // used to reset the time value on blur if it's invalid
        // TODO: handle this in the picker component instead
        const oldTime = newDate.tz(this.settings.get('timezone')).format('HH:mm');

        if (!time) {
            event.target.value = oldTime;
            return;
        }

        if (time.match(/^\d:\d\d$/)) {
            time = `0${time}`;
        }

        if (!time.match(/^\d\d:\d\d$/)) {
            event.target.value = oldTime;
            return;
        }

        const [hour, minute] = time.split(':').map(n => parseInt(n, 10));

        if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
            event.target.value = oldTime;
            return;
        }

        // hour/minute will be the site timezone equivalent but we need the hour/minute
        // as it would be in UTC
        const conversionDate = moment().tz(this.settings.get('timezone'));
        conversionDate.set({hour, minute});
        const utcDate = moment.utc(conversionDate);

        newDate.set({hour: utcDate.get('hour'), minute: utcDate.get('minute')});

        this.args.publishOptions.setScheduledAt(newDate);
    }
}
