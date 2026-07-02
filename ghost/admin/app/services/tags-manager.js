import Service, {inject as service} from '@ember/service';
import {escapeNqlString} from '../utils/escape-nql-string';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class TagsManagerService extends Service {
    @service store;

    @tracked tagsScreenInfinityModel = null;

    _loadedTags = this.store.peekAll('tag');

    get loadedTags() {
        return this.sortTags(this._loadedTags);
    }

    sortTags(tags = []) {
        return tags
            .filter(tag => tag.get('id') !== null) // exclude unsaved tags
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));
    }

    @task({restartable: true})
    *searchTagsTask(term, {limit = 100, page = 1} = {}) {
        // debounce the search
        yield timeout(250);
        return yield this.store.query('tag', {filter: `tags.name:~${escapeNqlString(term)}`, limit, page, order: 'name asc'});
    }
}
