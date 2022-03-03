import Helper from '@ember/component/helper';
import moment from 'moment';
import {inject as service} from '@ember/service';

export default class MomentSiteTz extends Helper {
    @service settings;

    compute([date]) {
        const tzMoment = moment.tz(date, this.settings.get('timezone'));
        console.log({tzMoment});
        return tzMoment;
    }
}
