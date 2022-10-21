import Component from '@glimmer/component';
import {A} from '@ember/array';
import {action, get} from '@ember/object';
import {
    defaultMatcher,
    filterOptions
} from 'ember-power-select/utils/group-utils';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhResourceSelect extends Component {
    @service store;

    @tracked _options = [];

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    get searchField() {
        return this.args.searchField === undefined ? 'name' : this.args.searchField;
    }

    @action
    searchAndSuggest(term, select) {
        return this.searchAndSuggestTask.perform(term, select);
    }

    @task
    *searchAndSuggestTask(term) {
        let newOptions = this.flatOptions.toArray();

        if (term.length === 0) {
            return newOptions;
        }

        // todo: we can do actual filtering on posts here (allow searching when we have lots and lots of posts)
        yield undefined;

        newOptions = this._filter(A(newOptions), term);

        return newOptions;
    }

    get matcher() {
        return this.args.matcher || defaultMatcher;
    }

    _filter(options, searchText) {
        let matcher;
        if (this.searchField) {
            matcher = (option, text) => this.matcher(get(option, this.searchField), text);
        } else {
            matcher = (option, text) => this.matcher(option, text);
        }
        return filterOptions(options || [], searchText, matcher);
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

    get selectedOption() {
        if (this.args.resource.title) {
            return this.args.resource;
        }
        const resource = this.args.resource ?? {};
        return this.flatOptions.find(option => resource.id === option.id);
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

    get searchPlaceholderText() {
        if (this.args.type === 'email') {
            return 'Search emails';
        }
        return 'Search posts/pages';
    }

    @task
    *fetchOptionsTask() {
        const options = yield [];
        
        if (this.args.type === 'email') {
            const posts = yield this.store.query('post', {filter: '(status:published,status:sent)+newsletter_id:-null', limit: 'all'});
            options.push(...posts.map(mapResource));
            this._options = options;
            return;
        }

        const posts = yield this.store.query('post', {filter: 'status:published', limit: 'all'});
        const pages = yield this.store.query('page', {filter: 'status:published', limit: 'all'});

        function mapResource(resource) {
            return {
                id: resource.id,
                title: resource.title
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
