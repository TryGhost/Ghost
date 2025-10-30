import RSVP from 'rsvp';
import Service from '@ember/service';
import {default as Flexsearch} from 'flexsearch';
import {SEARCHABLES, createSearchResult, sortSearchResultsByStatus} from '../utils/search';
import {isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const {Document} = Flexsearch;

export default class SearchProviderFlexService extends Service {
    @service ajax;
    @service notifications;
    @service ghostPaths;

    indexes = SEARCHABLES.reduce((indexes, searchable) => {
        indexes[searchable.model] = new Document({
            tokenize: 'forward',
            document: {
                id: 'id',
                index: searchable.index,
                store: true
            }
        });

        return indexes;
    }, {});

    /* eslint-disable require-yield */
    @task
    *searchTask(term) {
        const results = [];

        SEARCHABLES.forEach((searchable) => {
            const searchResults = this.indexes[searchable.model].search(term, {enrich: true});
            const usedIds = new Set();
            let groupResults = [];

            searchResults.forEach((field) => {
                field.result.forEach((searchResult) => {
                    const {id, doc} = searchResult;

                    if (usedIds.has(id)) {
                        return;
                    }

                    usedIds.add(id);

                    groupResults.push(createSearchResult(searchable, doc));
                });
            });

            groupResults = sortSearchResultsByStatus(groupResults, searchable.model);

            if (!isEmpty(groupResults)) {
                results.push({
                    groupName: searchable.name,
                    options: groupResults
                });
            }
        });

        return results;
    }
    /* eslint-enable require-yield */

    @task
    *refreshContentTask() {
        try {
            const promises = SEARCHABLES.map(searchable => this.#loadSearchable(searchable));
            yield RSVP.all(promises);
        } catch (error) {
            // eslint-disable-next-line
            console.error(error);
        }
    }

    async #loadSearchable(searchable) {
        const url = this.ghostPaths.url.api(`search-index/${pluralize(searchable.model)}`);
        const query = {};

        try {
            const response = await this.ajax.request(url, {data: query});

            response[pluralize(searchable.model)].forEach((item) => {
                this.indexes[searchable.model].add(item);
            });
        } catch (error) {
            console.error(error); // eslint-disable-line

            this.notifications.showAPIError(error, {
                key: `search.load${searchable.name}.error`
            });
        }
    }
}
