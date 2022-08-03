import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class VerifyNewsletterEmail extends Component {
    @service ajax;
    @service ghostPaths;
    @service router;
    @service store;

    @tracked error = null;
    @tracked newsletter = null;

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
            const url = this.ghostPaths.url.api('newsletters', 'verifications');

            const response = yield this.ajax.put(url, {data: {token}});

            if (response.newsletters) {
                this.store.pushPayload('newsletter', response);
                const newsletter = this.store.peekRecord('newsletter', response.newsletters[0].id);
                this.newsletter = newsletter;
            }
        } catch (e) {
            this.error = e.message;
        }
    }

    @action
    handleRouteChange() {
        this.args.close();
    }
}
