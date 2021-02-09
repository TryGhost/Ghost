import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class LaunchController extends Controller {
    @service config;
    @service router;
    @service settings;
    @service ui;

    queryParams = ['step'];

    @tracked previewGuid = (new Date()).valueOf();
    @tracked previewSrc = '';
    @tracked step = 'customise-design';

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
    };

    skippedSteps = [];

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
    goNextStep() {
        this.step = this.currentStep.next;
    }

    @action
    goBackStep() {
        let step = this.currentStep.back;

        while (this.skippedSteps.includes(step)) {
            this.skippedSteps = this.skippedSteps.filter(s => s !== step);
            step = this.steps[step].back;
        }

        this.step = step;
    }

    // TODO: remember when a step is skipped so "back" works as expected
    @action
    skipStep() {
        let step = this.currentStep.next;
        let skipToStep = this.currentStep.skip;

        while (step !== skipToStep) {
            this.skippedSteps.push(step);
            step = this.steps[step].next;
        }

        this.step = step;
    }

    @action
    refreshPreview() {
        this.previewGuid = (new Date()).valueOf();
    }

    @action
    updatePreview(url) {
        this.previewSrc = url;
    }

    @action
    close() {
        this.router.transitionTo('dashboard');
    }

    @action
    setup() {
        this.ui.set('showTour', false);
    }

    @action
    reset() {
        this.step = 'customise-design';
        this.skippedSteps = [];
        this.ui.set('showTour', true);
    }
}
