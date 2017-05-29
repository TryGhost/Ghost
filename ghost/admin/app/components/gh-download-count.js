import Component from 'ember-component';
import Ember from 'ember';
import injectService from 'ember-service/inject';
import {task, timeout} from 'ember-concurrency';

const {testing} = Ember;
const INTERVAL = testing ? 20 : 2000;

export default Component.extend({
    ajax: injectService(),
    ghostPaths: injectService(),

    count: '',

    _poll: task(function* () {
        let url = this.get('ghostPaths.count');
        let pattern = /(-?\d+)(\d{3})/;

        try {
            let data = yield this.get('ajax').request(url);
            let count = data.count.toString();

            while (pattern.test(count)) {
                count = count.replace(pattern, '$1,$2');
            }

            this.set('count', count);

            if (!testing) {
                yield timeout(INTERVAL);
                this.get('_poll').perform();
            }
        } catch (e) {
            // no-op - we don't want to create noise for a failed download count
        }
    }),

    didInsertElement() {
        this.get('_poll').perform();
    }
});
