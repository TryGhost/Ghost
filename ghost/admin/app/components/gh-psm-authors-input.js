import Component from '@ember/component';
import {escapeNqlString} from '../helpers/escape-nql-string';
import {not} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 250;
const AUTHORS_INCLUDE = 'count.posts';
const AUTHORS_ORDER = 'count.posts desc, name asc';

export default Component.extend({

    store: service(),

    // public attrs
    selectedAuthors: null,
    tagName: '',
    triggerId: '',

    // internal attrs
    availableAuthors: null,
    _hasLoadedAllAuthors: false,

    // closure actions
    updateAuthors() {},

    // Search the API while the background all-authors query is still loading.
    // Once all authors are in Ember Data we can fall back to local filtering.
    useServerSideSearch: not('_hasLoadedAllAuthors'),

    init() {
        this._super(...arguments);
        this.set('availableAuthors', this._sortAuthors(this.store.peekAll('user').toArray()));
        this.loadAllAuthorsTask.perform();
    },

    actions: {
        updateAuthors(newAuthors) {
            this.updateAuthors(newAuthors);
        }
    },

    // Load every author in the background, page by page, so Ember Data and the
    // dropdown are updated after each response instead of waiting for `limit=all`.
    loadAllAuthorsTask: task(function* () {
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages && !this.isDestroying && !this.isDestroyed) {
            const authors = yield this.store.query('user', {
                include: AUTHORS_INCLUDE,
                order: AUTHORS_ORDER,
                limit: PAGE_SIZE,
                page
            });

            if (this.isDestroying || this.isDestroyed) {
                return;
            }

            this.set('availableAuthors', this._sortAuthors(this.store.peekAll('user').toArray()));

            const pagination = authors.meta?.pagination;
            if (pagination?.pages) {
                hasMorePages = pagination.page < pagination.pages;
            } else {
                hasMorePages = authors.length >= PAGE_SIZE;
            }

            page += 1;
        }

        if (!this.isDestroying && !this.isDestroyed) {
            this.set('_hasLoadedAllAuthors', true);
        }
    }).drop(),

    // wired to GhTokenInput's @search only when `useServerSideSearch` is true.
    // restartable + a 250ms timeout means the API is queried at most once per
    // 250ms of typing.
    searchAuthorsTask: task(function* (term) {
        yield timeout(SEARCH_DEBOUNCE_MS);

        const localAuthors = this._localAuthorMatches(term);
        const authors = yield this._fetchRemoteAuthors(term);
        return this._mergeAuthors(localAuthors, authors.toArray());
    }).restartable(),

    _fetchRemoteAuthors(term) {
        // match name, slug, or email. The OR group is parenthesised so it's
        // combined as a unit with the endpoint's default status filter.
        const nqlTerm = escapeNqlString(term);
        return this.store.query('user', {
            include: AUTHORS_INCLUDE,
            filter: `(name:~${nqlTerm},slug:~${nqlTerm},email:~${nqlTerm})`,
            order: AUTHORS_ORDER,
            limit: PAGE_SIZE
        });
    },

    _filterSelectedAuthors(authors) {
        const selectedIds = new Set((this.selectedAuthors || []).map(author => author.id));
        return this._sortAuthors(authors.filter(author => !selectedIds.has(author.id)));
    },

    _mergeAuthors(...authorLists) {
        const seenIds = new Set();
        const authors = [];

        authorLists.forEach((authorList) => {
            authorList.forEach((author) => {
                if (!author.id || seenIds.has(author.id)) {
                    return;
                }

                seenIds.add(author.id);
                authors.push(author);
            });
        });

        return this._filterSelectedAuthors(authors);
    },

    _localAuthorMatches(term) {
        const availableAuthors = this.availableAuthors?.toArray ? this.availableAuthors.toArray() : (this.availableAuthors || []);
        return this._filterSelectedAuthors(availableAuthors).filter((author) => {
            return this.matchAuthor(author, term) >= 0;
        });
    },

    _authorPostCount(author) {
        return Number(author.count?.posts || 0);
    },

    _sortAuthors(authors) {
        return authors.slice().sort((authorA, authorB) => {
            const postCountDiff = this._authorPostCount(authorB) - this._authorPostCount(authorA);

            if (postCountDiff !== 0) {
                return postCountDiff;
            }

            return (authorA.name || '').localeCompare(authorB.name || '');
        });
    },

    // client-side fallback matcher (sites with <= PAGE_SIZE authors) - mirrors
    // the server-side search by matching name, slug, or email. Returns 0 on a
    // match and -1 otherwise, per ember-power-select's matcher contract.
    matchAuthor(author, searchTerm) {
        const term = (searchTerm || '').toLowerCase();
        const matches = [author.name, author.slug, author.email].some((field) => {
            return (field || '').toLowerCase().includes(term);
        });
        return matches ? 0 : -1;
    }

});
