import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {mapBy} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    clock: service(),

    classNames: ['form-group', 'for-select'],

    timezone: null,
    availableTimezones: null,

    // Allowed actions
    update: () => {},

    availableTimezoneNames: mapBy('availableTimezones', 'name'),

    hasTimezoneOverride: computed('timezone', 'availableTimezoneNames', function () {
        let timezone = this.timezone;
        let availableTimezoneNames = this.availableTimezoneNames;

        return !availableTimezoneNames.includes(timezone);
    }),

    selectedTimezone: computed('timezone', 'availableTimezones', 'hasTimezoneOverride', function () {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let timezone = this.timezone;
        let availableTimezones = this.availableTimezones;

        if (hasTimezoneOverride) {
            return {name: '', label: ''};
        }

        return availableTimezones
            .filterBy('name', timezone)
            .get('firstObject');
    }),

    selectableTimezones: computed('availableTimezones', 'hasTimezoneOverride', function () {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let availableTimezones = this.availableTimezones;

        if (hasTimezoneOverride) {
            return [{name: '', label: ''}, ...availableTimezones];
        }

        return availableTimezones;
    }),

    localTime: computed('hasTimezoneOverride', 'timezone', 'selectedTimezone', 'clock.second', function () {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let timezone = hasTimezoneOverride ? this.timezone : this.get('selectedTimezone.name');

        this.get('clock.second');
        return timezone ? moment().tz(timezone).format('HH:mm:ss') : moment().utc().format('HH:mm:ss');
    }),

    actions: {
        setTimezone(timezone) {
            this.update(timezone);
        }
    }
});
