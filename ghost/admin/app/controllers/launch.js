import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class LaunchController extends Controller {
    @service config;
    @service router;
    @service settings;

    queryParams = ['step'];

    @tracked previewGuid = (new Date()).valueOf();
    @tracked previewSrc = '';

    steps = {
        'customise-design': {
            title: 'Customise your site',
            position: 'Step 1',
            next: 'connect-stripe'
        },
        'connect-stripe': {
            title: 'Connect to Stripe',
            position: 'Step 2',
            next: 'set-pricing',
            back: 'customise-design',
            skip: 'finalise'
        },
        'set-pricing': {
            title: 'Set up subscriptions',
            position: 'Step 3',
            next: 'finalise',
            back: 'connect-stripe'
        },
        finalise: {
            title: 'Launch your site',
            position: 'Final step',
            back: 'set-pricing'
        }
    }

    @tracked step = 'customise-design';

    get currentStep() {
        return this.steps[this.step];
    }

    @action
    goToStep(step) {
        if (step) {
            this.step = step;
        }
    }

    @action
    nextStep() {
        this.step = this.currentStep.next;
    }

    @action
    backStep() {
        this.step = this.currentStep.back;
    }

    // TODO: remember when a step is skipped so "back" works as expected
    @action
    skipStep() {
        this.step = this.currentStep.skip;
    }

    @action
    refreshPreview() {
        this.previewGuid = (new Date()).valueOf();
    }

    @action
    updatePreview(url) {
        console.log({url});
        this.previewSrc = url;
    }

    @action
    close() {
        this.router.transitionTo('dashboard');
    }

    @action
    reset() {
        this.step = 'customise-design';
    }
}
