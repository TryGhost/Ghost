import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {isBlank, isEmpty} from '@ember/utils';
import {or, reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    settings: service(),

    tagName: '',

    date: '',
    time: '',
    errors: null,
    dateErrorProperty: null,
    timeErrorProperty: null,

    _time: '',
    _previousTime: '',
    _minDate: null,
    _maxDate: null,

    blogTimezone: reads('settings.activeTimezone'),
    hasError: or('dateError', 'timeError'),

    timezone: computed('blogTimezone', function () {
        let blogTimezone = this.get('blogTimezone');
        return moment.utc().tz(blogTimezone).format('z');
    }),

    dateError: computed('errors.[]', 'dateErrorProperty', function () {
        let errors = this.get('errors');
        let property = this.get('dateErrorProperty');

        if (!isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }
    }),

    timeError: computed('errors.[]', 'timeErrorProperty', function () {
        let errors = this.get('errors');
        let property = this.get('timeErrorProperty');

        if (!isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }
    }),

    didReceiveAttrs() {
        let date = this.get('date');
        let time = this.get('time');
        let minDate = this.get('minDate');
        let maxDate = this.get('maxDate');
        let blogTimezone = this.get('blogTimezone');

        if (!isBlank(date)) {
            this.set('_date', moment(date));
        } else {
            this.set('_date', moment().tz(blogTimezone));
        }

        if (isBlank(time)) {
            this.set('_time', this.get('_date').format('HH:mm'));
        } else {
            this.set('_time', this.get('time'));
        }
        this.set('_previousTime', this.get('_time'));

        // unless min/max date is at midnight moment will diable that day
        if (minDate === 'now') {
            this.set('_minDate', moment(moment().format('YYYY-MM-DD')));
        } else if (!isBlank(minDate)) {
            this.set('_minDate', moment(moment(minDate).format('YYYY-MM-DD')));
        } else {
            this.set('_minDate', null);
        }

        if (maxDate === 'now') {
            this.set('_maxDate', moment(moment().format('YYYY-MM-DD')));
        } else if (!isBlank(maxDate)) {
            this.set('_maxDate', moment(moment(maxDate).format('YYYY-MM-DD')));
        } else {
            this.set('_maxDate', null);
        }
    },

    actions: {
        // if date or time is set and the other property is blank set that too
        // so that we don't get "can't be blank" errors
        setDate(date) {
            if (date !== this.get('_date')) {
                this.get('setDate')(date);

                if (isBlank(this.get('time'))) {
                    this.get('setTime')(this.get('_time'));
                }
            }
        },

        setTime(time) {
            if (time.match(/^\d:\d\d$/)) {
                time = `0${time}`;
            }

            if (time !== this.get('_previousTime')) {
                this.get('setTime')(time);
                this.set('_previousTime', time);

                if (isBlank(this.get('date'))) {
                    this.get('setDate')(this.get('_date'));
                }
            }
        }
    }
});
