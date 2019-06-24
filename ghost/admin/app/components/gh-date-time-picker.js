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
        let blogTimezone = this.blogTimezone;
        return moment.utc().tz(blogTimezone).format('z');
    }),

    dateError: computed('errors.[]', 'dateErrorProperty', function () {
        let errors = this.errors;
        let property = this.dateErrorProperty;

        if (errors && !isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }

        return '';
    }),

    timeError: computed('errors.[]', 'timeErrorProperty', function () {
        let errors = this.errors;
        let property = this.timeErrorProperty;

        if (errors && !isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }

        return '';
    }),

    didReceiveAttrs() {
        let date = this.date;
        let time = this.time;
        let minDate = this.minDate;
        let maxDate = this.maxDate;
        let blogTimezone = this.blogTimezone;

        if (!isBlank(date)) {
            this.set('_date', moment(date));
        } else {
            this.set('_date', moment().tz(blogTimezone));
        }

        if (isBlank(time)) {
            this.set('_time', this._date.format('HH:mm'));
        } else {
            this.set('_time', this.time);
        }
        this.set('_previousTime', this._time);

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
            if (date !== this._date) {
                this.setDate(date);

                if (isBlank(this.time)) {
                    this.setTime(this._time);
                }
            }
        },

        setTime(time) {
            if (time.match(/^\d:\d\d$/)) {
                time = `0${time}`;
            }

            if (time !== this._previousTime) {
                this.setTime(time);
                this.set('_previousTime', time);

                if (isBlank(this.date)) {
                    this.setDate(this._date);
                }
            }
        }
    }
});
