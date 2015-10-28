import Ember from 'ember';

const {Service, run} = Ember;

const MEDIA_QUERIES = {
    maxWidth600: '(max-width: 600px)',
    isMobile: '(max-width: 800px)',
    maxWidth900: '(max-width: 900px)',
    maxWidth1000: '(max-width: 1000px)'
};

export default Service.extend({
    init() {
        this._super(...arguments);
        this._handlers = [];
        this.loadQueries(MEDIA_QUERIES);
    },

    loadQueries(queries) {
        Object.keys(queries).forEach((key) => {
            this.loadQuery(key, queries[key]);
        });
    },

    loadQuery(key, queryString) {
        let query = window.matchMedia(queryString);

        this.set(key, query.matches);

        let handler = run.bind(this, () => {
            let lastValue = this.get(key);
            let newValue = query.matches;
            if (lastValue !== newValue) {
                this.set(key, query.matches);
            }
        });
        query.addListener(handler);
        this._handlers.push([query, handler]);
    },

    willDestroy() {
        this._handlers.forEach(([query, handler]) => {
            query.removeListener(handler);
        });
        this._super(...arguments);
    }

});
