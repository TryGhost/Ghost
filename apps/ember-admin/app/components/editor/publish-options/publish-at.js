import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublishAtOption extends Component {
    @service settings;

    @action
    setDate(selectedDate) {
        // selectedDate is a Date object that contains the correct date string in the blog timezone
        const selectedMoment = moment.tz(selectedDate, this.settings.timezone);
        const {years, months, date} = selectedMoment.toObject();

        // Create a new moment from existing scheduledAtUTC _in site timezone_.
        // This ensures we're setting the date correctly because we don't need
        // to account for the converted UTC date being yesterday/tomorrow.
        const newDate = moment.tz(
            this.args.publishOptions.scheduledAtUTC,
            this.settings.timezone
        );
        newDate.set({years, months, date});

        // converts back to UTC
        this.args.publishOptions.setScheduledAt(newDate);
    }

    @action
    setTime(time, event) {
        const newDate = moment.tz(this.args.publishOptions.scheduledAtUTC, this.settings.timezone);

        // used to reset the time value on blur if it's invalid
        const oldTime = newDate.format('HH:mm');

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

        newDate.set({hour, minute});
        this.args.publishOptions.setScheduledAt(newDate);
    }
}
