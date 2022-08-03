import Service from '@ember/service';
import classic from 'ember-classic-decorator';
import config from 'ghost-admin/config/environment';
import moment from 'moment';
import {run} from '@ember/runloop';

const ONE_SECOND = 1000;

// Creates a clock service to run intervals.

@classic
export default class ClockService extends Service {
    second = null;
    minute = null;
    hour = null;

    init() {
        super.init(...arguments);
        this.tick();
    }

    tick() {
        let now = moment().utc();

        this.setProperties({
            second: now.seconds(),
            minute: now.minutes(),
            hour: now.hours()
        });

        if (config.environment !== 'test') {
            run.later(() => {
                this.tick();
            }, ONE_SECOND);
        }
    }
}
