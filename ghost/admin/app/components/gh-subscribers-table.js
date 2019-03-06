import Component from '@ember/component';

export default Component.extend({
    classNames: ['subscribers-table'],

    table: null,

    actions: {
        onScrolledToBottom() {
            let loadNextPage = this.loadNextPage;

            if (!this.isLoading) {
                loadNextPage();
            }
        }
    }
});
