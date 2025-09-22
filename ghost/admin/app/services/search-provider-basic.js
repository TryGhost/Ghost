import RSVP from 'rsvp';
import Service from '@ember/service';
import {isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export const SEARCHABLES = [
    {
        name: 'Staff',
        model: 'user',
        idField: 'slug',
        titleField: 'name'
    },
    {
        name: 'Tags',
        model: 'tag',
        idField: 'slug',
        titleField: 'name'
    },
    {
        name: 'Posts',
        model: 'post',
        idField: 'id',
        titleField: 'title'
    },
    {
        name: 'Pages',
        model: 'page',
        idField: 'id',
        titleField: 'title'
    }
];

export default class SearchProviderBasicService extends Service {
    @service ajax;
    @service notifications;
    @service ghostPaths;

    content = [];

    /* eslint-disable require-yield */
    @task
    *searchTask(term) {
        const normalizedTerm = term.toString().toLowerCase();
        const results = [];

        SEARCHABLES.forEach((searchable) => {
            let matchedContent = this.content.filter((item) => {
                const normalizedTitle = item.title.toString().toLowerCase();
                return (
                    item.groupName === searchable.name &&
                    normalizedTitle.indexOf(normalizedTerm) >= 0
                );
            });

            // Sort posts/pages by status priority (scheduled > draft > published > sent)
            if (searchable.model === 'post' || searchable.model === 'page') {
                const statusPriority = {
                    scheduled: 1,
                    draft: 2,
                    published: 3,
                    sent: 4
                };

                matchedContent.sort((a, b) => {
                    const aPriority = statusPriority[a.status] || 5;
                    const bPriority = statusPriority[b.status] || 5;

                    return aPriority - bPriority;
                });
            }

            if (!isEmpty(matchedContent)) {
                results.push({
                    groupName: searchable.name,
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
        const promises = SEARCHABLES.map(searchable => this._loadSearchable(searchable, content));

        try {
            yield RSVP.all(promises);
            this.content = content;
        } catch (error) {
            // eslint-disable-next-line
            console.error(error);
        }
    }

    async _loadSearchable(searchable, content) {
        const url = this.ghostPaths.url.api(`search-index/${pluralize(searchable.model)}`);
        const query = {};

        try {
            const response = await this.ajax.request(url, {data: query});

            const items = response[pluralize(searchable.model)].map(
                item => ({
                    id: `${searchable.model}.${item[searchable.idField]}`,
                    url: item.url,
                    title: item[searchable.titleField],
                    groupName: searchable.name,
                    status: item.status,
                    visibility: item.visibility,
                    publishedAt: item.published_at
                })
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
