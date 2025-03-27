import Helper from '@ember/component/helper';
import moment from 'moment-timezone';
import {inject as service} from '@ember/service';

export default class IsMomentToday extends Helper {
    @service settings;

    compute([date]) {
        const today = moment().tz(this.settings.timezone);
        const dateMoment = moment.tz(date, this.settings.timezone);

        return dateMoment.isSame(today, 'day');
    }
}
