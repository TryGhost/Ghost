import Component from '@glimmer/component';
import fetch from 'fetch';
import {action} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const RSS_FEED_URL = 'https://zapier.com/engine/rss/678920/ghoststaffpicks';
const LIMIT = 3;

export default class StaffPicks extends Component {
    @tracked loading = null;
    @tracked error = null;
    @tracked staffPicks = null;

    @action
    load() {
        this.loading = true;
        this.fetch.perform().then(() => {
            this.loading = false;
        }, (error) => {
            this.error = error;
            this.loading = false;
        });
    }

    @task
    *fetch() {
        let response = yield fetch(RSS_FEED_URL);
        if (!response.ok) {
            // eslint-disable-next-line
            console.error('Failed to fetch staff picks', {response});
            this.error = 'Failed to fetch';
            return;
        }
        
        const str = yield response.text();
        const document = new DOMParser().parseFromString(str, 'text/xml');

        const items = document.querySelectorAll('channel > item');
        this.staffPicks = [];
        
        for (let index = 0; index < items.length && index < LIMIT; index += 1) {
            const item = items[index];
            const title = item.getElementsByTagName('title')[0].textContent;
            const link = item.getElementsByTagName('link')[0].textContent;
            const creator = item.getElementsByTagName('dc:creator')[0].textContent;

            const entry = {
                title,
                link,
                creator
            };
            
            this.staffPicks.push(entry);
        }
    }
}
