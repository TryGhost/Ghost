import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import moment from 'moment';
import {action, computed} from '@ember/object';
import {isBlank, isEmpty} from '@ember/utils';
import {or, reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {tagName} from '@ember-decorators/component';

const DATE_FORMAT = 'YYYY-MM-DD';

@classic
@tagName('')
export default class GhDateTimePicker extends Component {
    @service settings;

    date = '';
    dateFormat = DATE_FORMAT;
    time = '';
    errors = null;
    dateErrorProperty = null;
    timeErrorProperty = null;
    isActive = true;
    _time = '';
    _previousTime = '';
    _minDate = null;
    _maxDate = null;
    _scratchDate = null;
    _scratchDateError = null;

    // actions
    setTypedDateError() {}

    get renderInPlaceWithFallback() {
        return this.renderInPlace === undefined ? true : this.renderInPlace;
    }

    @reads('settings.timezone')
        blogTimezone;

    @or('dateError', 'timeError')
        hasError;

    @computed('_date', '_scratchDate')
    get dateValue() {
        if (this._scratchDate !== null) {
            return this._scratchDate;
        } else {
            return moment(this._date).format(DATE_FORMAT);
        }
    }

    @computed('blogTimezone')
    get timezone() {
        let blogTimezone = this.blogTimezone;
        return moment.utc().tz(blogTimezone).format('z');
    }

    @computed('errors.[]', 'dateErrorProperty', '_scratchDateError')
    get dateError() {
        if (this._scratchDateError) {
            return this._scratchDateError;
        }

        let errors = this.errors;
        let property = this.dateErrorProperty;

        if (errors && !isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }

        return '';
    }

    @computed('errors.[]', 'timeErrorProperty')
    get timeError() {
        let errors = this.errors;
        let property = this.timeErrorProperty;

        if (errors && !isEmpty(errors.errorsFor(property))) {
            return errors.errorsFor(property).get('firstObject').message;
        }

        return '';
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

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

        // reset scratch date if the component becomes inactive
        // (eg, PSM is closed, or save type is changed away from scheduled)
        if (!this.isActive && this._lastIsActive) {
            this._resetScratchDate();
        }
        this._lastIsActive = this.isActive;

        // reset scratch date if date is changed externally
        if ((date && date.valueOf()) !== (this._lastDate && this._lastDate.valueOf())) {
            this._resetScratchDate();
        }
        this._lastDate = this.date;

        if (isBlank(time)) {
            this.set('_time', moment(this._date).format('HH:mm'));
        } else {
            this.set('_time', this.time);
        }
        this.set('_previousTime', this._time);

        // unless min/max date is at midnight moment will diable that day
        if (minDate === 'now') {
            this.set('_minDate', moment(moment().format(DATE_FORMAT)));
        } else if (!isBlank(minDate)) {
            this.set('_minDate', moment(moment(minDate).format(DATE_FORMAT)));
        } else {
            this.set('_minDate', null);
        }

        if (maxDate === 'now') {
            this.set('_maxDate', moment(moment().format(DATE_FORMAT)));
        } else if (!isBlank(maxDate)) {
            this.set('_maxDate', moment(moment(maxDate).format(DATE_FORMAT)));
        } else {
            this.set('_maxDate', null);
        }
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this.setTypedDateError(null);
    }

    // if date or time is set and the other property is blank set that too
    // so that we don't get "can't be blank" errors
    @action
    setDateInternal(date) {
        if (date !== this._date) {
            this.setDate(date);

            if (isBlank(this.time)) {
                this.setTime(this._time);
            }
        }
    }

    @action
    setTimeInternal(time, event) {
        if (time.match(/^\d:\d\d$/)) {
            time = `0${time}`;
        }

        if (time !== this._previousTime) {
            this.setTime(time, event);
            this.set('_previousTime', time);

            if (isBlank(this.date)) {
                this.setDate(this._date);
            }
        }
    }

    @action
    updateTimeValue(event) {
        this.set('_time', event.target.value);
    }

    @action
    registerTimeInput(elem) {
        this._timeInputElem = elem;
    }

    @action
    onDateInput(datepicker, event) {
        let skipFocus = true;
        datepicker.actions.close(event, skipFocus);
        this.set('_scratchDate', event.target.value);
    }

    @action
    onDateBlur(event) {
        // make sure we're not doing anything just because the calendar dropdown
        // is opened and clicked
        if (event.target.value === moment(this._date).format('YYYY-MM-DD')) {
            this._resetScratchDate();
            return;
        }

        if (!event.target.value) {
            this._resetScratchDate();
        } else {
            this._setDate(event.target.value);
        }
    }

    @action
    onDateKeydown(datepicker, event) {
        if (event.key === 'Escape') {
            this._resetScratchDate();
        }

        if (event.key === 'Enter') {
            this._setDate(event.target.value);
            event.preventDefault();
            event.stopImmediatePropagation();
            datepicker.actions.close();
        }

        // close the dropdown and manually focus the time input if necessary
        // so that keyboard focus behaves as expected
        if (event.key === 'Tab' && datepicker.isOpen) {
            datepicker.actions.close();

            // manual focus is required because the dropdown is rendered in place
            // and the default browser behaviour will move focus to the dropdown
            // which is then removed from the DOM making it look like focus has
            // disappeared. Shift+Tab is fine because the DOM is not changing in
            // that direction
            if (!event.shiftKey && this._timeInputElem) {
                event.preventDefault();
                this._timeInputElem.focus();
                this._timeInputElem.select();
            }
        }

        // capture a Ctrl/Cmd+S combo to make sure that the model value is updated
        // before the save occurs or we abort the save if the value is invalid
        if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            let wasValid = this._setDate(event.target.value);
            if (!wasValid) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }
    }

    // internal methods

    _resetScratchDate() {
        this.set('_scratchDate', null);
        this._setScratchDateError(null);
    }

    _setDate(dateStr) {
        if (!dateStr.match(/^\d\d\d\d-\d\d-\d\d$/)) {
            this._setScratchDateError('Invalid date format, must be YYYY-MM-DD');
            return false;
        }

        let date = moment(dateStr, DATE_FORMAT);
        if (!date.isValid()) {
            this._setScratchDateError('Invalid date');
            return false;
        }

        this.setDateInternal(date.toDate());
        this._resetScratchDate();
        return true;
    }

    _setScratchDateError(error) {
        this.set('_scratchDateError', error);
        this.setTypedDateError(error);
    }
}
