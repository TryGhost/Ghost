import RSVP from 'rsvp';
import Service from '@ember/service';
import {default as Flexsearch} from 'flexsearch';
import {isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const {Document} = Flexsearch;

export const SEARCHABLES = [
    {
        name: 'Staff',
        model: 'user',
        pathField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Tags',
        model: 'tag',
        pathField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Posts',
        model: 'post',
        pathField: 'id',
        titleField: 'title',
        index: ['title']
    },
    {
        name: 'Pages',
        model: 'page',
        pathField: 'id',
        titleField: 'title',
        index: ['title']
    },
    {
        name: 'Settings',
        model: 'setting',
        pathField: 'id',
        titleField: 'title',
        index: ['title', 'keywords']
    }
];

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
            const groupResults = [];

            searchResults.forEach((field) => {
                field.result.forEach((searchResult) => {
                    const {id, doc} = searchResult;

                    if (usedIds.has(id)) {
                        return;
                    }

                    usedIds.add(id);

                    groupResults.push({
                        groupName: searchable.name,
                        id: `${searchable.model}.${doc[searchable.pathField]}`,
                        title: doc[searchable.titleField],
                        url: doc.url,
                        path: doc.path,
                        status: doc.status,
                        visibility: doc.visibility,
                        publishedAt: doc.published_at
                    });
                });
            });

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

            // Special handling for settings which returns settings array
            if (searchable.model === 'setting') {
                const settings = response.settings || response.data;
                if (settings && Array.isArray(settings)) {
                    settings.forEach((item) => {
                        // For settings, we need to index both title and keywords
                        const indexItem = {
                            id: item.id,
                            url: item.url,
                            path: item.path,
                            title: item.title,
                            section: item.section,
                            keywords: item.keywords ? item.keywords.join(' ') : ''
                        };
                        this.indexes[searchable.model].add(indexItem);
                    });
                }
            } else {
                const items = response[pluralize(searchable.model)];
                if (items) {
                    items.forEach((item) => {
                        this.indexes[searchable.model].add(item);
                    });
                }
            }
        } catch (error) {
            console.error(error); // eslint-disable-line

            this.notifications.showAPIError(error, {
                key: `search.load${searchable.name}.error`
            });
        }
    }
}
