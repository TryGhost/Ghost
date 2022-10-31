import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class VerifyEmail extends Component {
    @service ajax;
    @service ghostPaths;
    @service router;
    @service store;
    @service settings;

    @tracked error = null;
    @tracked email = null;

    constructor() {
        super(...arguments);
        this.verifyEmailTask.perform(this.args.data.token);

        this.router.on('routeDidChange', this.handleRouteChange);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router.off('routeDidChange', this.handleRouteChange);
    }

    @task
    *verifyEmailTask(token) {
        try {
            const url = this.ghostPaths.url.api('settings', 'verifications');

            yield this.ajax.put(url, {data: {token}});
            yield this.settings.reload();
            this.email = this.settings.membersSupportAddress;
        } catch (e) {
            this.error = e.message;
        }
    }

    @action
    handleRouteChange() {
        this.args.close();
    }
}
