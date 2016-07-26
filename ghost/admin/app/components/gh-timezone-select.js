import Component from 'ember-component';
import computed, {mapBy} from 'ember-computed';
import injectService from 'ember-service/inject';
import {invokeAction} from 'ember-invoke-action';

export default Component.extend({
    classNames: ['form-group', 'for-select'],

    activeTimezone: null,
    availableTimezones: null,

    clock: injectService(),

    availableTimezoneNames: mapBy('availableTimezones', 'name'),

    hasTimezoneOverride: computed('activeTimezone', 'availableTimezoneNames', function () {
        let activeTimezone = this.get('activeTimezone');
        let availableTimezoneNames = this.get('availableTimezoneNames');

        return !availableTimezoneNames.contains(activeTimezone);
    }),

    selectedTimezone: computed('activeTimezone', 'availableTimezones', 'hasTimezoneOverride', function () {
        let hasTimezoneOverride = this.get('hasTimezoneOverride');
        let activeTimezone = this.get('activeTimezone');
        let availableTimezones = this.get('availableTimezones');

        if (hasTimezoneOverride) {
            return {name: '', label: ''};
        }

        return availableTimezones
            .filterBy('name', activeTimezone)
            .get('firstObject');
    }),

    selectableTimezones: computed('availableTimezones', 'hasTimezoneOverride', function () {
        let hasTimezoneOverride = this.get('hasTimezoneOverride');
        let availableTimezones = this.get('availableTimezones');

        if (hasTimezoneOverride) {
            return [{name: '', label: ''}, ...availableTimezones];
        }

        return availableTimezones;
    }),

    localTime: computed('hasTimezoneOverride', 'activeTimezone', 'selectedTimezone', 'clock.second', function () {
        let hasTimezoneOverride = this.get('hasTimezoneOverride');
        let timezone = hasTimezoneOverride ? this.get('activeTimezone') : this.get('selectedTimezone.name');

        this.get('clock.second');
        return timezone ? moment().tz(timezone).format('HH:mm:ss') : moment().utc().format('HH:mm:ss');
    }),

    actions: {
        setTimezone(timezone) {
            invokeAction(this, 'update', timezone);
        }
    }
});
