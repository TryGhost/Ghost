import Component from '@glimmer/component';
import moment from 'moment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublishAtOption extends Component {
    @service settings;

    @action
    setDate(selectedDate) {
        const newDate = moment(this.args.publishOptions.scheduledAtUTC);
        const {years, months, date} = moment(selectedDate).toObject();

        newDate.set({years, months, date});

        this.args.publishOptions.setScheduledAt(newDate);
    }

    @action
    setTime(time, event) {
        const newDate = moment.tz(this.args.publishOptions.scheduledAtUTC, this.settings.get('timezone'));

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
