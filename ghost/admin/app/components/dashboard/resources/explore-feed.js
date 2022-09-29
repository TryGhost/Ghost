import Component from '@glimmer/component';
import fetch from 'fetch';
import {action} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const API_URL = 'https://ghost.org';

export default class ExploreFeed extends Component {
    @tracked loading = null;
    @tracked error = null;
    @tracked sites = null;
    @tracked meta = null;

    @action
    load() {
        this.loading = true;
        this.fetch.perform().then(() => {
            this.loading = false;
        }).catch((error) => {
            this.error = error;
            this.loading = false;
        });
    }

    @task
    *fetch() {
        const response = yield fetch(`${API_URL}/explore/api/feed/`);
        if (!response.ok) {
            // eslint-disable-next-line
            console.error('Failed to fetch sites', {response});
            this.error = 'Failed to fetch';
            return;
        }

        const result = yield response.json();
        this.sites = result.sites || [];
        this.meta = result.meta || [];
    }
}
