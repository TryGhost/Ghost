import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {tracked} from '@glimmer/tracking';

export class DateError extends Error {
    constructor(msgOrObj) {
        if (typeof msgOrObj === 'string') {
            super(msgOrObj);
        } else {
            super(msgOrObj.message);
            Object.keys(msgOrObj).forEach((key) => {
                if (key !== 'message') {
                    this[key] = msgOrObj[key];
                }
            });
        }
    }
}

export default class GhDatePicker extends Component {
    @tracked error = null;

    get dateFormat() {
        return 'YYYY-MM-DD';
    }

    get minDate() {
        return this._minMaxMoment(this.args.minDate);
    }

    get maxDate() {
        return this._minMaxMoment(this.args.maxDate);
    }

    @action
    setDate(dateStr) {
        this.error = null;

        if (!dateStr.match(/^\d\d\d\d-\d\d-\d\d$/)) {
            this.error = `Date must be ${this.dateFormat}`;
            this.args.onError?.(new DateError({
                message: this.error,
                date: dateStr
            }));
            return false;
        }

        const mDate = moment(dateStr);

        if (!mDate.isValid()) {
            this.error = 'Invalid date';
            this.args.onError?.(new DateError({
                message: this.error,
                date: dateStr
            }));
            return false;
        }

        if (this.args.minDate && mDate.isBefore(moment(this.args.minDate))) {
            this.error = this.args.minDateError || `Must be on or after ${moment(this.args.minDate).format(this.dateFormat)}`;

            this.args.onError?.(new DateError({
                message: this.error,
                date: dateStr
            }));
            return false;
        }

        if (this.args.maxDate && mDate.isAfter(moment(this.args.maxDate))) {
            this.error = this.args.maxDateError || `Must be on or before ${moment(this.args.maxDate).format(this.dateFormat)}`;
            this.args.onError?.(new DateError({
                message: this.error,
                date: dateStr
            }));
            return false;
        }

        this.args.onChange?.(mDate.toDate());
    }

    @action
    onDateSelected(datepickerEvent) {
        if (datepickerEvent instanceof moment) {
            this.setDate(datepickerEvent.format(this.dateFormat));
        } else {
            this.setDate(datepickerEvent.id);
        }
    }

    @action
    onDateInput(datepicker, event) {
        const skipFocus = true;
        datepicker.actions.close(event, skipFocus);

        this.args.onInput?.(event);
    }

    @action
    onDateBlur(event) {
        const value = event.target.value;

        if (!value) {
            this.resetInputValue(event.target);
        } else {
            this.setDate(value);
        }

        this.args.onBlur?.(event);
    }

    @action
    onDateKeydown(datepicker, event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.resetInputValue(event.target);
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.setDate(event.target.value);
            datepicker.actions.close();
        }

        this.args.onKeydown?.(event);
    }

    @action
    resetInputValue(input) {
        input.value = moment(this.args.value).format(this.dateFormat);
        this.error = null;
    }

    _minMaxMoment(date) {
        if (date === 'now') {
            return moment(moment().format(this.dateFormat));
        } else if (!isBlank(date)) {
            return moment(moment(date).format(this.dateFormat));
        } else {
            return null;
        }
    }
}
