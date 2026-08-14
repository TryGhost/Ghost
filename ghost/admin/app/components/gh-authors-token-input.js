import Component from '@glimmer/component';
import {action} from '@ember/object';
import {escapeNqlString} from '../utils/escape-nql-string';
import {inject as service} from '@ember/service';
import {stripDiacritics} from 'ember-power-select/utils/group-utils';

const AUTHORS_INCLUDE = 'count.posts';
const AUTHORS_ORDER = 'count.posts desc, name asc';
const SEARCH_DEBOUNCE_MS = 250;

export default class GhAuthorsTokenInput extends Component {
    @service store;

    @action
    loadAuthorsPage({limit, page}) {
        return this.store.query('user', {
            include: AUTHORS_INCLUDE,
            order: AUTHORS_ORDER,
            limit,
            page
        });
    }

    @action
    searchAuthorsPage(term, {limit, page}) {
        const nqlTerm = escapeNqlString(term);

        return this.store.query('user', {
            include: AUTHORS_INCLUDE,
            filter: `(name:~${nqlTerm},slug:~${nqlTerm},email:~${nqlTerm})`,
            order: AUTHORS_ORDER,
            limit,
            page
        });
    }

    @action
    sortAuthors(authors) {
        return authors.slice().sort((authorA, authorB) => {
            const postCountDiff = this._authorPostCount(authorB) - this._authorPostCount(authorA);

            if (postCountDiff !== 0) {
                return postCountDiff;
            }

            return (authorA.name || '').localeCompare(authorB.name || '');
        });
    }

    @action
    matchAuthor(author, searchTerm) {
        const term = stripDiacritics(searchTerm || '').toLowerCase();
        const matches = [author.name, author.slug, author.email].some((field) => {
            return stripDiacritics(field || '').toLowerCase().includes(term);
        });

        return matches ? 0 : -1;
    }

    get searchDebounceMs() {
        return SEARCH_DEBOUNCE_MS;
    }

    _authorPostCount(author) {
        return Number(author.count?.posts || 0);
    }
}
