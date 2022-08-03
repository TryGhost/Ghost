import Controller from '@ember/controller';
import envConfig from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DEFAULT_STEPS = {
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
export default class LaunchController extends Controller {
    @service config;
    @service router;
    @service settings;

    queryParams = ['step'];

    @tracked previewGuid = (new Date()).valueOf();
    @tracked previewSrc = '';
    @tracked step = 'customise-design';
    @tracked data = null;

    steps = DEFAULT_STEPS;

    skippedSteps = [];

    constructor(...args) {
        super(...args);
        const siteUrl = this.config.get('blogUrl');

        if (envConfig.environment !== 'development' && !/^https:/.test(siteUrl)) {
            this.steps = {
                'customise-design': {
                    title: 'Customise your site',
                    position: 'Step 1',
                    next: 'set-pricing'
                },
                'set-pricing': {
                    title: 'Set up subscriptions',
                    position: 'Step 2',
                    next: 'finalise',
                    back: 'customise-design'
                },
                finalise: {
                    title: 'Launch your site',
                    position: 'Final step',
                    back: 'set-pricing'
                }
            };
        } else {
            this.steps = DEFAULT_STEPS;
        }
    }

    get currentStep() {
        return this.steps[this.step];
    }

    @action
    storeData(data) {
        this.data = data;
    }

    @action
    getData() {
        return this.data;
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
    registerPreviewIframe(element) {
        this.previewIframe = element;
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
    replacePreviewContents(html) {
        if (this.previewIframe) {
            this.previewIframe.contentWindow.document.open();
            this.previewIframe.contentWindow.document.write(html);
            this.previewIframe.contentWindow.document.close();
        }
    }

    @action
    close() {
        this.router.transitionTo('dashboard');
    }

    @action
    reset() {
        this.data = null;
        this.step = 'customise-design';
        this.skippedSteps = [];
    }
}
