import Service, {inject as service} from '@ember/service';
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
    *searchTagsTask(term, {page = 1} = {}) {
        // debounce the search
        yield timeout(250);
        const safeTerm = term.replace(/'/g, `\\'`);
        return yield this.store.query('tag', {filter: `tags.name:~'${safeTerm}'`, limit: 100, page, order: 'name asc'});
    }
}