import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class GhMembersSegmentSelect extends Component {
    @service store;

    @tracked options = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get flatOptions() {
        const options = [];

        function getOptions(option) {
            if (option.options) {
                return option.options.forEach(getOptions);
            }

            options.push(option);
        }

        this.options.forEach(getOptions);

        return options;
    }

    get selectedOptions() {
        const segments = (this.args.segment || '').split(',');
        return this.flatOptions.filter(option => segments.includes(option.segment));
    }

    @action
    setSegment(options) {
        const segment = options.mapBy('segment').join(',') || null;
        this.args.onChange?.(segment);
    }

    @task
    *fetchOptionsTask() {
        const options = yield [{
            name: 'Free members',
            segment: 'status:free',
            class: 'segment-status'
        }, {
            name: 'Paid members',
            segment: 'status:-free', // paid & comped
            class: 'segment-status'
        }];

        this.options = options;
    }
}
