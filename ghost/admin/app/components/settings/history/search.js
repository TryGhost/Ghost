import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default class HistorySearch extends Component {
    @service store;

    @action
    clear() {
        this.args.onChange(null);
    }

    @task
    *searchUsersTask(term) {
        yield timeout(300); // debounce

        return yield this.store.query('user', {search: term, limit: 20});
    }
}
