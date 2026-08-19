import Component from '@glimmer/component';
import paywallCardPreview from 'ghost-admin/utils/paywall-card-preview';
import paywallPreviewAudience from 'ghost-admin/utils/paywall-preview-audience';
import webPaywallAudience from 'ghost-admin/utils/web-paywall-audience';
import {action} from '@ember/object';
import {publishFlowDots, visiblePublishSteps} from 'ghost-admin/utils/publish-flow-steps';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PublishFlowSteppedOptions extends Component {
    @service settings;

    @tracked stepIndex = 0;

    // Which way the last move went, so the entrance can travel with it - a step
    // arriving from below on the way back reads as another step forward
    @tracked isGoingBack = false;

    get steps() {
        return visiblePublishSteps(this.args.publishOptions);
    }

    get dots() {
        return publishFlowDots(this.args.publishOptions, this.currentIndex);
    }

    // Going back and switching to site-only removes a step, which can leave the
    // index past the end - clamp rather than letting the flow render nothing.
    get currentIndex() {
        return Math.min(this.stepIndex, this.steps.length - 1);
    }

    get currentStep() {
        return this.steps[this.currentIndex];
    }

    get stepNumber() {
        return this.currentIndex + 1;
    }

    get totalSteps() {
        return this.steps.length;
    }

    get isFirstStep() {
        return this.currentIndex === 0;
    }

    get isLastStep() {
        return this.currentIndex === this.steps.length - 1;
    }

    // The name of the next screen and nothing else - "Continue to" was the same
    // two words on every step, so the only part that ever changed was buried at
    // the end. The arrow carries the "continue".
    get continueText() {
        const next = this.steps[this.currentIndex + 1];
        const label = next ? next.shortLabel : 'review';

        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    // Only speaks up when someone in the send actually lands on the paywall
    get previewAudience() {
        return paywallPreviewAudience(this.args.publishOptions.post, this.args.publishOptions.combinedRecipientFilter, {willEmail: true});
    }

    // step 2 asks about the send, so it previews the email paywall
    get paywallPreview() {
        return paywallCardPreview(this.args.publishOptions.post, 'email', this.settings.accentColor);
    }

    // step 1 covers what goes up on the site, so it previews the web paywall
    get webAudience() {
        return webPaywallAudience(this.args.publishOptions.post);
    }

    get webPaywallPreview() {
        return paywallCardPreview(this.args.publishOptions.post, 'web', this.settings.accentColor);
    }

    @action
    next() {
        if (this.isLastStep) {
            this.args.confirm();
            return;
        }

        this.isGoingBack = false;
        this.stepIndex = this.currentIndex + 1;
    }

    @action
    back() {
        this.isGoingBack = true;
        this.stepIndex = Math.max(this.currentIndex - 1, 0);
    }
}
