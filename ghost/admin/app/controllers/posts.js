import Controller from 'ember-controller';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';

export default Controller.extend({

    queryParams: ['type'],
    type: null,

    session: injectService(),

    showDeletePostModal: false,

    showingAll: computed('type', function () {
        return this.get('type') === null;
    }),

    actions: {
        toggleDeletePostModal() {
            this.toggleProperty('showDeletePostModal');
        }
    }
});
