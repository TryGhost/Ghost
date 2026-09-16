import RSVP from 'rsvp';
import Service from '@ember/service';
import {createSearchResult, getSearchables, sortSearchResultsByStatus} from '../utils/search';
import {inject} from 'ghost-admin/decorators/inject';
import {isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class SearchProviderBasicService extends Service {
    @service ajax;
    @service notifications;
    @service ghostPaths;

    @inject config;

    content = [];

    constructor() {
        super(...arguments);

        this.searchables = getSearchables(this.config.hostSettings);
    }

    /* eslint-disable require-yield */
    @task
    *searchTask(term) {
        const normalizedTerm = term.toString().toLowerCase();
        const results = [];

        this.searchables.forEach((searchable) => {
            // only match fields the searchable declares in its index
            const keywordsIndexed = Boolean(searchable.index?.includes('keywords'));

            let matchedContent = this.content.filter((item) => {
                if (item.groupName !== searchable.name) {
                    return false;
                }

                const normalizedTitle = item.title.toString().toLowerCase();
                const normalizedKeywords = keywordsIndexed && item.keywords ? item.keywords.toString().toLowerCase() : '';

                return (
                    normalizedTitle.indexOf(normalizedTerm) >= 0 ||
                    normalizedKeywords.indexOf(normalizedTerm) >= 0
                );
            });

            matchedContent = sortSearchResultsByStatus(matchedContent, searchable.model);

            if (!isEmpty(matchedContent)) {
                results.push({
                    groupName: searchable.name,
                    groupKey: searchable.key,
                    options: matchedContent
                });
            }
        });

        return results;
    }
    /* eslint-enable require-yield */

    @task
    *refreshContentTask() {
        const content = [];
        const promises = this.searchables.map(searchable => this._loadSearchable(searchable, content));

        try {
            yield RSVP.all(promises);
            this.content = content;
        } catch (error) {
            // eslint-disable-next-line
            console.error(error);
        }
    }

    async _loadSearchable(searchable, content) {
        if (searchable.staticItems) {
            const items = searchable.staticItems.map(
                item => createSearchResult(searchable, item)
            );

            content.push(...items);
            return;
        }

        const url = this.ghostPaths.url.api(`search-index/${pluralize(searchable.model)}`);
        const query = {};

        try {
            const response = await this.ajax.request(url, {data: query});

            const items = response[pluralize(searchable.model)].map(
                item => createSearchResult(searchable, item)
            );

            content.push(...items);
        } catch (error) {
            console.error(error); // eslint-disable-line

            this.notifications.showAPIError(error, {
                key: `search.load${searchable.name}.error`
            });
        }
    }
}
