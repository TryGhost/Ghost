import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhResourceSelect extends Component {
    @service store;

    @tracked _options = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    constructor() {
        super(...arguments);
        this.fetchOptionsTask.perform();
    }

    get options() {
        return this._options;
    }

    get flatOptions() {
        const options = [];

        function getOptions(option) {
            if (option.options) {
                return option.options.forEach(getOptions);
            }

            options.push(option);
        }

        this._options.forEach(getOptions);

        return options;
    }

    get selectedOptions() {
        const resources = this.args.resources || [];
        return this.flatOptions.filter(option => resources.find(resource => resource.id === option.id));
    }

    @action
    onChange(options) {
        this.args.onChange(options);
    }

    get placeholderText() {
        if (this.args.type === 'email') {
            return 'Select an email';
        }
        return 'Select a page/post';
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];
        
        if (this.args.type === 'email') {
            const posts = yield this.store.query('post', {filter: '(status:published,status:sent)+newsletter_id:-null', limit: 'all'});
            options.push({
                groupName: 'Emails',
                options: posts.map(mapResource)
            });
            this._options = options;
            return;
        }

        const posts = yield this.store.query('post', {filter: 'status:published', limit: 'all'});
        const pages = yield this.store.query('page', {filter: 'status:published', limit: 'all'});

        function mapResource(resource) {
            return {
                name: resource.title,
                id: resource.id
            };
        }

        if (posts.length > 0) {
            options.push({
                groupName: 'Posts',
                options: posts.map(mapResource)
            });
        }

        if (pages.length > 0) {
            options.push({
                groupName: 'Pages',
                options: pages.map(mapResource)
            });
        }

        this._options = options;
    }
}
