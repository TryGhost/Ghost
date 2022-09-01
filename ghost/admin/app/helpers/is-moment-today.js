import Helper from '@ember/component/helper';
import moment from 'moment';
import {inject as service} from '@ember/service';

export default class IsMomentToday extends Helper {
    @service settings;

    compute([date]) {
        const today = moment().tz(this.settings.get('timezone'));
        const dateMoment = moment.tz(date, this.settings.get('timezone'));

        return dateMoment.isSame(today, 'day');
    }
}
