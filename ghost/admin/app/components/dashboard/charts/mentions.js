import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service store;
    @service dashboardStats;

    @tracked mentions = [];

    @action 
    async loadData() {
        this.mentions = await this.store.query('mention', {limit: 5, order: 'created_at desc'});
    }
}
