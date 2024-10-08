import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class SigninVerifyController extends Controller {
    @service ajax;
    @service session;

    @tracked flowErrors = '';
    @tracked token = '';

    @action
    validateToken() {
        return true;
    }

    @action
    handleTokenInput(event) {
        this.token = event.target.value;
    }

    @task
    *verifyTokenTask() {
        try {
            yield this.session.authenticate('authenticator:cookie', {token: this.token});
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                this.flowErrors = error.payload.errors[0].message;
            } else {
                this.flowErrors = 'There was a problem with the verification token.';
            }
        }
    }
}
