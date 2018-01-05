import Ember from 'ember';
import Service from '@ember/service';
import moment from 'moment';
import {run} from '@ember/runloop';

const ONE_SECOND = 1000;

// Creates a clock service to run intervals.

export default Service.extend({
    second: null,
    minute: null,
    hour: null,

    init() {
        this.tick();
    },

    tick() {
        let now = moment().utc();

        this.setProperties({
            second: now.seconds(),
            minute: now.minutes(),
            hour: now.hours()
        });

        if (!Ember.testing) { // eslint-disable-line
            run.later(() => {
                this.tick();
            }, ONE_SECOND);
        }
    }

});
