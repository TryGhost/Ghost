import Ember from 'ember';

const MEDIA_QUERIES = {
    maxWidth600: '(max-width: 600px)',
    isMobile: '(max-width: 800px)',
    maxWidth900: '(max-width: 900px)',
    maxWidth1000: '(max-width: 1000px)'
};

export default Ember.Service.extend({
    init: function () {
        this._super(...arguments);
        this._handlers = [];
        this.loadQueries(MEDIA_QUERIES);
    },

    loadQueries: function (queries) {
        Object.keys(queries).forEach(key => {
            this.loadQuery(key, queries[key]);
        });
    },

    loadQuery: function (key, queryString) {
        let query = window.matchMedia(queryString);

        this.set(key, query.matches);

        let handler = Ember.run.bind(this, () => {
            let lastValue = this.get(key);
            let newValue = query.matches;
            if (lastValue !== newValue) {
                this.set(key, query.matches);
            }
        });
        query.addListener(handler);
        this._handlers.push([query, handler]);
    },

    willDestroy: function () {
        this._handlers.forEach(([query, handler]) => {
            query.removeListener(handler);
        });
        this._super(...arguments);
    }

});
