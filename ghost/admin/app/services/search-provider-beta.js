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
        fields: ['id', 'slug', 'url', 'name', 'profile_image'],
        pathField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Tags',
        model: 'tag',
        fields: ['id', 'slug', 'url', 'name'],
        pathField: 'slug',
        titleField: 'name',
        index: ['name']
    },
    {
        name: 'Posts',
        model: 'post',
        fields: ['id', 'url', 'title', 'status', 'published_at', 'visibility'],
        order: 'updated_at desc', // ensure we use a simple rather than default order for faster response
        pathField: 'id',
        titleField: 'title',
        index: ['title']
    },
    {
        name: 'Pages',
        model: 'page',
        fields: ['id', 'url', 'title', 'status', 'published_at', 'visibility'],
        order: 'updated_at desc', // ensure we use a simple rather than default order for faster response
        pathField: 'id',
        titleField: 'title',
        index: ['title']
    }
];

export default class SearchProviderService extends Service {
    @service ajax;
    @service notifications;
    @service store;

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
        const url = `${this.store.adapterFor(searchable.model).urlForQuery({}, searchable.model)}/`;
        const query = {fields: searchable.fields, limit: 10000, order: searchable.order};

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
