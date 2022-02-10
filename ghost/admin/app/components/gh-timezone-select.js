import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import moment from 'moment';
import {action, computed} from '@ember/object';
import {classNames} from '@ember-decorators/component';
import {mapBy} from '@ember/object/computed';
import {inject as service} from '@ember/service';

@classic
@classNames('form-group', 'for-select')
export default class GhTimezoneSelect extends Component {
    @service clock;

    timezone = null;
    availableTimezones = null;

    // Allowed actions
    update = () => {};

    @mapBy('availableTimezones', 'name')
        availableTimezoneNames;

    @computed('timezone', 'availableTimezoneNames')
    get hasTimezoneOverride() {
        let timezone = this.timezone;
        let availableTimezoneNames = this.availableTimezoneNames;

        return !availableTimezoneNames.includes(timezone);
    }

    @computed('timezone', 'availableTimezones', 'hasTimezoneOverride')
    get selectedTimezone() {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let timezone = this.timezone;
        let availableTimezones = this.availableTimezones;

        if (hasTimezoneOverride) {
            return {name: '', label: ''};
        }

        return availableTimezones
            .filterBy('name', timezone)
            .get('firstObject');
    }

    @computed('availableTimezones', 'hasTimezoneOverride')
    get selectableTimezones() {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let availableTimezones = this.availableTimezones;

        if (hasTimezoneOverride) {
            return [{name: '', label: ''}, ...availableTimezones];
        }

        return availableTimezones;
    }

    @computed('hasTimezoneOverride', 'timezone', 'selectedTimezone', 'clock.second')
    get localTime() {
        let hasTimezoneOverride = this.hasTimezoneOverride;
        let timezone = hasTimezoneOverride ? this.timezone : this.get('selectedTimezone.name');

        this.get('clock.second');
        return timezone ? moment().tz(timezone).format('HH:mm:ss') : moment().utc().format('HH:mm:ss');
    }

    @action
    setTimezone(timezone) {
        this.update(timezone);
    }
}
