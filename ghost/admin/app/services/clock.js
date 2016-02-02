import Ember from 'ember';

const {
    Service,
    run
} = Ember;

const ONE_SECOND = 1000;

// Creates a clock service to run intervals.

export default Service.extend({
    second: null,
    minute: null,
    hour:   null,

    init() {
        this.tick();
    },

    tick() {
        let now = moment().utc();
        this.setProperties({
            second: now.seconds(),
            minute: now.minutes(),
            hour:   now.hours()
        });

        if (!Ember.testing) {
            run.later(() => {
                this.tick();
            }, ONE_SECOND);
        }

    }

});
