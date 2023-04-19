/* eslint-disable camelcase */
import Component from '@glimmer/component';
import RSVP from 'rsvp';
import {action} from '@ember/object';
import {isBlank, isEmpty} from '@ember/utils';
import {pluralize} from 'ember-inflector';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task, timeout, waitForProperty} from 'ember-concurrency';

export default class GhSearchInputComponent extends Component {
    @service ajax;
    @service notifications;
    @service router;
    @service store;

    content = [];
    contentExpiresAt = false;
    contentExpiry = 30000;

    searchables = [{
        name: 'Posts',
        model: 'post',
        fields: ['id', 'title'],
        idField: 'id',
        titleField: 'title'
    }, {
        name: 'Pages',
        model: 'page',
        fields: ['id', 'title'],
        idField: 'id',
        titleField: 'title'
    }, {
        name: 'Users',
        model: 'user',
        fields: ['slug', 'name'],
        idField: 'slug',
        titleField: 'name'
    }, {
        name: 'Tags',
        model: 'tag',
        fields: ['slug', 'name'],
        idField: 'slug',
        titleField: 'name'
    }];

    @action
    openSelected(selected) {
        if (!selected) {
            return;
        }

        this.args.onSelected?.(selected);

        if (selected.searchable === 'Posts') {
            let id = selected.id.replace('post.', '');
            this.router.transitionTo('editor.edit', 'post', id);
        }

        if (selected.searchable === 'Pages') {
            let id = selected.id.replace('page.', '');
            this.router.transitionTo('editor.edit', 'page', id);
        }

        if (selected.searchable === 'Users') {
            let id = selected.id.replace('user.', '');
            this.router.transitionTo('settings.staff.user', id);
        }

        if (selected.searchable === 'Tags') {
            let id = selected.id.replace('tag.', '');
            this.router.transitionTo('tag', id);
        }
    }

    @action
    onClose(select, keyboardEvent) {
        // refocus search input after dropdown is closed (eg, by pressing Escape)
        run.later(() => {
            keyboardEvent?.target.focus();
        });
    }

    @task({restartable: true})
    *searchTask(term) {
        if (isBlank(term)) {
            return [];
        }

        // start loading immediately in the background
        this.refreshContentTask.perform();

        // debounce searches to 200ms to avoid thrashing CPU
        yield timeout(200);

        // wait for any on-going refresh to finish
        if (this.refreshContentTask.isRunning) {
            yield waitForProperty(this, 'refreshContentTask.isIdle');
        }

        const searchResult = this._searchContent(term);

        return searchResult;
    }

    _searchContent(term) {
        const normalizedTerm = term.toString().toLowerCase();
        const results = [];

        this.searchables.forEach((searchable) => {
            const matchedContent = this.content.filter((item) => {
                const normalizedTitle = item.title.toString().toLowerCase();
                return (item.searchable === searchable.name) && (normalizedTitle.indexOf(normalizedTerm) >= 0);
            });

            if (!isEmpty(matchedContent)) {
                results.push({
                    groupName: searchable.name,
                    options: matchedContent
                });
            }
        });

        return results;
    }

    @task({drop: true})
    *refreshContentTask() {
        let now = new Date();
        let contentExpiresAt = this.contentExpiresAt;

        if (contentExpiresAt > now) {
            return true;
        }

        const content = [];
        const promises = this.searchables.map(searchable => this._loadSearchable(searchable, content));

        try {
            yield RSVP.all(promises);
            this.content = content;
        } catch (error) {
            // eslint-disable-next-line
            console.error(error);
        }

        let contentExpiry = this.contentExpiry;
        this.contentExpiresAt = new Date(now.getTime() + contentExpiry);
    }

    _loadSearchable(searchable, content) {
        let url = `${this.store.adapterFor(searchable.model).urlForQuery({}, searchable.model)}/`;
        let maxSearchableLimit = '10000';
        let query = {fields: searchable.fields, limit: maxSearchableLimit};

        return this.ajax.request(url, {data: query}).then((response) => {
            const items = response[pluralize(searchable.model)].map(item => ({
                id: `${searchable.model}.${item[searchable.idField]}`,
                title: item[searchable.titleField],
                searchable: searchable.name
            }));

            content.push(...items);
        }).catch((error) => {
            this.notifications.showAPIError(error, {key: `search.load${searchable.name}.error`});
        });
    }
}
