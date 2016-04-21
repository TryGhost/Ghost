import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['subscribers-table'],

    table: null,

    actions: {
        onScrolledToBottom() {
            let loadNextPage = this.get('loadNextPage');

            if (!this.get('isLoading')) {
                loadNextPage();
            }
        }
    }
});
