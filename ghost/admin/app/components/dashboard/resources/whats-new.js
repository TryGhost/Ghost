import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class WhatsNew extends Component {
    @service whatsNew;

    @tracked entries = null;
    @tracked loading = null;
    @tracked error = null;

    @action
    load() {
        this.loading = true;
        this.whatsNew.fetchLatest.perform().then(() => {
            this.loading = false;
            this.entries = this.whatsNew.entries.slice(0, 3);
        }, (error) => {
            this.error = error;
            this.loading = false;
        });
    }
}
