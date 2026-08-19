import Confirm from 'ghost-admin/components/editor/modals/publish-flow/confirm';
import {describe, it} from 'mocha';
import {expect} from 'chai';

// built without the constructor so the unit test needs no container. The two
// audience getters are stubbed because they read services; what's under test is
// how the component combines them.
function buildConfirm({
    recipientType = 'paid',
    previewAudience = null,
    willEmail = true,
    willPublish = true,
    webPaywallAudience = null,
    newsletterName = 'Practical effector',
    onlyDefaultNewsletter = true,
    isScheduled = false,
    displayName = 'post',
    timezone = 'Etc/UTC'
} = {}) {
    const confirm = Object.create(Confirm.prototype);

    Object.defineProperty(confirm, 'willEmail', {get: () => willEmail});
    Object.defineProperty(confirm, 'willPublish', {get: () => willPublish});
    Object.defineProperty(confirm, 'previewAudience', {get: () => previewAudience});
    Object.defineProperty(confirm, 'webPaywallAudience', {get: () => webPaywallAudience});

    confirm.settings = {timezone};
    confirm.args = {
        recipientType,
        publishOptions: {
            onlyDefaultNewsletter,
            isScheduled,
            scheduledAtUTC: '2026-08-12T09:00:00.000Z',
            newsletter: {name: newsletterName},
            post: {displayName}
        }
    };

    return confirm;
}

describe('Unit: Component: editor/modals/publish-flow/confirm', function () {
    // the sentence itself assembles in the template, where the async counts
    // live - the component decides only which of the four shapes it takes
    describe('the email sentence shape', function () {
        it('is post-and-preview when both audiences have someone', function () {
            const confirm = buildConfirm({recipientType: 'paid', previewAudience: 'free members'});

            expect(confirm.emailShape).to.equal('post-and-preview');
        });

        it('is post-only when no preview is going out', function () {
            const confirm = buildConfirm({recipientType: 'paid', previewAudience: null});

            expect(confirm.emailShape).to.equal('post-only');
        });

        // both audiences are independently optional, so the post can reach
        // nobody while the preview reaches someone - "where" would be wrong there
        it('is preview-only when nobody was picked for the post', function () {
            const confirm = buildConfirm({recipientType: 'none', previewAudience: 'free members'});

            expect(confirm.emailShape).to.equal('preview-only');
        });

        it('is nothing when neither audience has anyone in it', function () {
            const confirm = buildConfirm({recipientType: 'none', previewAudience: null});

            expect(confirm.emailShape).to.equal(null);
        });

        it('is nothing when the post is site-only', function () {
            const confirm = buildConfirm({willEmail: false});

            expect(confirm.emailShape).to.equal(null);
        });
    });

    // the destination, then who meets the paywall there
    describe('the site line', function () {
        it('states the paywall audience as its own sentence', function () {
            const confirm = buildConfirm({webPaywallAudience: 'free members and public visitors'});

            expect(confirm.siteSummary)
                .to.equal('Published on your site. Free members and public visitors will see the paywall.');
        });

        // an ungated post has no clause to add
        it('stops at the destination when nothing is gated', function () {
            const confirm = buildConfirm({webPaywallAudience: null});

            expect(confirm.siteSummary).to.equal('Published on your site.');
        });

        // the absence is said by its own note, not as a destination
        it('is nothing when the post is email-only', function () {
            const confirm = buildConfirm({willPublish: false});

            expect(confirm.siteSummary).to.equal(null);
        });
    });

    // the summary lines finish this sentence, so it has to end mid-clause
    describe('the lead-in sentence', function () {
        it('opens the sentence the summary blocks finish', function () {
            const confirm = buildConfirm();

            expect(confirm.summaryLead).to.equal('Your post will be…');
        });

        it('names a page as a page', function () {
            const confirm = buildConfirm({displayName: 'page'});

            expect(confirm.summaryLead).to.equal('Your page will be…');
        });

        // the timing qualifies both blocks, so it leads rather than sitting in one
        it('carries the schedule when there is one', function () {
            const confirm = buildConfirm({isScheduled: true});

            expect(confirm.summaryLead).to.equal('On August 12th at 09:00, your post will be…');
        });
    });

    // only worth naming when the site has more than one to choose between
    describe('the newsletter suffix', function () {
        it('is empty when there is only the default newsletter', function () {
            const confirm = buildConfirm({onlyDefaultNewsletter: true});

            expect(confirm.newsletterSuffix).to.equal('');
        });

        it('names the newsletter when the site has several', function () {
            const confirm = buildConfirm({onlyDefaultNewsletter: false});

            expect(confirm.newsletterSuffix).to.equal(' of Practical effector');
        });
    });
});
