import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({

    store: service(),

    // public attrs
    selectedAuthors: null,
    tagName: '',
    triggerId: '',

    // internal attrs
    availableAuthors: null,

    // closure actions
    updateAuthors() {},

    availableAuthorNames: computed('availableAuthors.@each.name', function () {
        return this.availableAuthors.map(author => author.get('name').toLowerCase());
    }),

    init() {
        this._super(...arguments);
        // perform a background query to fetch all users and set `availableAuthors`
        // to a live-query that will be immediately populated with what's in the
        // store and be updated when the above query returns
        this.store.query('user', {limit: 'all'});
        this.set('availableAuthors', this.store.peekAll('user'));
    },

    actions: {
        updateAuthors(newAuthors) {
            this.updateAuthors(newAuthors);
        }
    }

});
