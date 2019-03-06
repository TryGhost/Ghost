import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {mapBy} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    clock: service(),

    classNames: ['form-group', 'for-select'],

    activeTimezone: null,
    availableTimezones: null,

    // Allowed actions
    update: () => {},

    availableTimezoneNames: mapBy('availableTimezones', 'name'),

    hasTimezoneOverride: computed('activeTimezone', 'availableTimezoneNames', function () {
        let activeTimezone = this.activeTimezone;
        let availableTimezoneNames = this.availableTimezoneNames;

        return !availableTimezoneNames.includes(activeTimezone);
    }),

    selectedTimezone: computed('activeTimezone', 'availableTimezones', 'hasTimezoneOverride', function () {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let activeTimezone = this.activeTimezone;
        let availableTimezones = this.availableTimezones;

        if (hasTimezoneOverride) {
            return {name: '', label: ''};
        }

        return availableTimezones
            .filterBy('name', activeTimezone)
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

    localTime: computed('hasTimezoneOverride', 'activeTimezone', 'selectedTimezone', 'clock.second', function () {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let timezone = hasTimezoneOverride ? this.activeTimezone : this.get('selectedTimezone.name');

        this.get('clock.second');
        return timezone ? moment().tz(timezone).format('HH:mm:ss') : moment().utc().format('HH:mm:ss');
    }),

    actions: {
        setTimezone(timezone) {
            this.update(timezone);
        }
    }
});
