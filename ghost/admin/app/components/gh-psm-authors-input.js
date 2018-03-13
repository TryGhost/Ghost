import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({

    store: service(),

    // public attrs
    selectedAuthors: null,
    tagName: '',
    triggerId: '',

    // closure actions
    updateAuthors() {},

    // live-query of all users for author input autocomplete
    availableAuthors: computed(function () {
        return this.get('store').filter('user', {limit: 'all'}, () => true);
    }),

    availableAuthorNames: computed('availableAuthors.@each.name', function () {
        return this.get('availableAuthors').map(author => author.get('name').toLowerCase());
    }),

    actions: {
        updateAuthors(newAuthors) {
            this.updateAuthors(newAuthors);
        }
    }

});
