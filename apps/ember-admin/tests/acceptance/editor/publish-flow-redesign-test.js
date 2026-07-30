import loginAsRole from '../../helpers/login-as-role';
import {cleanupMockAnalyticsApps, mockAnalyticsApps} from '../../helpers/mock-analytics-apps';
import {click, find, findAll} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {enableMailgun} from '../../helpers/mailgun';
import {enableMembers, enablePaidMembers} from '../../helpers/members';
import {enableNewsletters} from '../../helpers/newsletters';
import {enableStripe} from '../../helpers/stripe';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Publish flow redesign', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(function () {
        mockAnalyticsApps();
        this.server.loadFixtures();

        enableLabsFlag(this.server, 'publishFlowRedesign');
        enableMembers(this.server);
        enablePaidMembers(this.server);
        enableMailgun(this.server);
        enableNewsletters(this.server, true);
        enableStripe(this.server);

        // recipient counts derive from real member queries; without members
        // email sending is disabled and the derived rows never render
        this.server.createList('member', 3, {status: 'free', email_disabled: 0});
        this.server.createList('member', 4, {status: 'paid', email_disabled: 0});
    });

    afterEach(function () {
        cleanupMockAnalyticsApps();
    });

    it('walks website -> email -> confirm and derives the email segment', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'public'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        // step 1: website — starts with the channel question
        expect(find('[data-test-publish-flow="website"]'), 'website step').to.exist;
        expect(find('[data-test-website-question]'), 'website yes/no question').to.exist;
        expect(find('[data-test-website-chip="yes"]').getAttribute('aria-pressed')).to.equal('true');
        expect(findAll('[data-test-visibility-chip]').length, 'visibility chips').to.equal(4);
        expect(find('[data-test-visibility-chip="public"]').getAttribute('aria-pressed')).to.equal('true');

        // content only shows once there's something to divide
        expect(find('[data-test-block-list]'), 'block list while public').to.not.exist;
        expect(find('[data-test-preview-question]'), 'preview question while public').to.not.exist;

        await click('[data-test-visibility-chip="paid"]');
        expect(find('[data-test-visibility-chip="paid"]').getAttribute('aria-pressed')).to.equal('true');

        // restricting surfaces the explicit preview question, defaulting to no
        expect(find('[data-test-preview-question]'), 'preview question when restricted').to.exist;
        expect(find('[data-test-preview-chip="no"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-block-list]'), 'block list before opting in').to.not.exist;

        // declining a preview states the consequence instead of staying silent
        expect(find('[data-test-no-preview-note]'), 'no-preview consequence note').to.exist;
        expect(find('[data-test-no-preview-note]').textContent).to.contain('only the title');

        await click('[data-test-button="continue"]');

        // step 2: email — its own yes/no question, derived audience, no
        // publish-type radios and no segment select
        expect(find('[data-test-publish-flow="email"]'), 'email step').to.exist;
        expect(find('[data-test-email-question]'), 'email yes/no question').to.exist;
        expect(find('[data-test-email-chip="yes"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-setting="publish-type"]'), 'publish type radios').to.not.exist;
        expect(find('[data-test-email-audience]'), 'derived audience row').to.exist;
        expect(find('[data-test-email-audience]').textContent).to.contain('Paid members');
        expect(find('[data-test-select="segment"]'), 'legacy segment select').to.not.exist;

        // no public preview on this post, so the row follows that decision:
        // free members default to nothing rather than to a broken teaser
        expect(find('[data-test-checkbox="upsell-free"]'), 'free upsell checkbox').to.not.exist;
        expect(find('[data-test-freerow="nothing"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-freerow="preview"]').getAttribute('aria-pressed')).to.equal('false');

        // the summary only appears at the final review
        expect(find('[data-test-text="who-gets-what"]'), 'summary on email step').to.not.exist;

        await click('[data-test-button="continue"]');

        // step 3: timing
        expect(find('[data-test-publish-flow="timing"]'), 'timing step').to.exist;
        expect(find('[data-test-setting="publish-at"]'), 'schedule controls').to.exist;

        await click('[data-test-button="continue"]');

        // final review: confirm with the who-gets-what summary
        expect(find('[data-test-publish-flow="confirm"]'), 'confirm step').to.exist;
        expect(find('[data-test-text="who-gets-what"]').textContent).to.contain('paid members');
        expect(find('[data-test-text="who-gets-what"]').textContent).to.contain('upgrade prompt');

        // per-group enumeration, including the group that gets nothing
        expect(find('[data-test-who-gets-what-groups]'), 'who-gets-what group card').to.exist;
        expect(find('[data-test-group="Paid members"]').textContent).to.contain('full post by email');
        expect(find('[data-test-group="Free members"]').textContent).to.contain('no email');

        // the committing button carries its consequence
        expect(find('[data-test-button="confirm-publish"]').textContent).to.contain('Publish & email');

        await click('[data-test-button="confirm-publish"]');

        // without a public preview the email must exclude free members
        const [emailedPost] = this.server.pretender.handledRequests
            .filter(request => request.method === 'PUT' && request.url.includes(`/posts/${post.id}/`))
            .map(request => new URL(request.url, 'http://localhost').searchParams.get('email_segment'))
            .filter(Boolean);
        expect(emailedPost, 'email_segment param').to.equal('status:-free');
    });

    it('shows a single derived row and no upsells for public posts', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'public'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        expect(find('[data-test-publish-flow="website"]'), 'website step').to.exist;
        await click('[data-test-button="continue"]');

        expect(find('[data-test-publish-flow="email"]'), 'email step').to.exist;
        expect(find('[data-test-email-audience]').textContent).to.contain('Subscribers');
        expect(find('[data-test-checkbox="upsell-free"]')).to.not.exist;
        expect(find('[data-test-no-preview-hint]')).to.not.exist;
    });

    it('keeps the existing flow when the flag is off', async function () {
        this.server.db.settings.update(
            {key: 'labs'},
            {value: JSON.stringify({})}
        );

        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        expect(find('[data-test-publish-flow="options"]'), 'old options step').to.exist;
        expect(find('[data-test-publish-flow="website"]'), 'website step').to.not.exist;
    });

    it('back navigation returns from email to website', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'members'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        await click('[data-test-button="continue"]');
        expect(find('[data-test-publish-flow="email"]')).to.exist;

        await click('[data-test-button="back-to-website-step"]');
        expect(find('[data-test-publish-flow="website"]')).to.exist;
    });

    it('email step shows no canvas when no derived email exists', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'paid'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');
        await click('[data-test-button="continue"]');

        expect(find('[data-test-publish-flow="email"]'), 'email step').to.exist;

        // without a free preview there is no derived email to witness — the
        // step runs fullscreen, no empty canvas, and the row says nothing
        expect(find('[data-test-email-canvas]'), 'email canvas').to.not.exist;
        expect(find('[data-test-freerow="nothing"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-preview-detail]'), 'preview detail on a web post').to.not.exist;
    });

    it('labels Update with its email consequence on published posts', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'published', visibility: 'public'});
        await visit(`/editor/post/${post.id}`);

        expect(find('[data-test-button="publish-save"]').textContent).to.contain('Update — no email');
    });

    it('timing step asks with chips and spells out a scheduled send', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'public'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');
        await click('[data-test-button="continue"]');
        await click('[data-test-button="continue"]');

        expect(find('[data-test-publish-flow="timing"]'), 'timing step').to.exist;
        expect(find('[data-test-timing-chip="now"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-schedule-card]'), 'schedule card while immediate').to.not.exist;
        expect(find('[data-test-timing-note]').textContent).to.contain('the moment you confirm');

        await click('[data-test-timing-chip="later"]');

        // the date/time controls arrive with a plain-language reading of them
        expect(find('[data-test-schedule-card]'), 'schedule card').to.exist;
        expect(find('[data-test-schedule-line]').textContent).to.contain('Goes out');

        await click('[data-test-button="continue"]');

        // a scheduled confirm schedules — the verb has to match the click
        expect(find('[data-test-button="confirm-publish"]').textContent).to.contain('Schedule');
        expect(find('[data-test-button="confirm-publish"]').textContent).to.not.contain('right now');
    });

    it('email-only posts decide access on the email step', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'paid'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');

        await click('[data-test-website-chip="no"]');

        // nothing else is asked here — no page means no page-shaped questions
        expect(find('[data-test-visibility-question]'), 'access question').to.not.exist;
        expect(find('[data-test-preview-question]'), 'preview question').to.not.exist;

        await click('[data-test-button="continue"]');

        // the outcome rows carry the decision, and the step says why there is
        // nothing else to answer
        expect(find('[data-test-email-question]'), 'send yes/no').to.not.exist;
        expect(find('[data-test-email-upsell="free"]'), 'free members row').to.exist;
        expect(find('[data-test-email-only-note]').textContent).to.contain('no page on your site');
    });

    it('a group without access can be sent the full post', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'paid'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');
        await click('[data-test-button="continue"]');

        // three outcomes on the row that owns them — not a switch of its own
        expect(find('[data-test-freerow="full"]'), 'full post option').to.exist;
        expect(find('[data-test-freerow="preview"]'), 'teaser option').to.exist;
        expect(find('[data-test-freerow="nothing"]'), 'nothing option').to.exist;
        expect(find('[data-test-bypass-paywall]'), 'standalone bypass switch').to.not.exist;

        await click('[data-test-freerow="full"]');

        expect(find('[data-test-freerow="full"]').getAttribute('aria-pressed')).to.equal('true');
        expect(find('[data-test-preview-detail]'), 'preview detail while sending in full').to.not.exist;
        expect(find('[data-test-bypass-note]').textContent).to.contain('stays for paid members');

        await click('[data-test-button="continue"]');
        await click('[data-test-button="continue"]');

        expect(find('[data-test-text="who-gets-what"]').textContent).to.contain('paywall is ignored');
        expect(find('[data-test-group="Free members"]').textContent).to.contain('full post by email');

        // a paid post has no tier without access — every paid tier can read it
        expect(findAll('[data-test-email-upsell="other-tiers"]').length, 'tier rows on a paid post').to.equal(0);
    });

    it('members visibility shows no upsell checkboxes', async function () {
        await loginAsRole('Administrator', this.server);

        const post = this.server.create('post', {status: 'draft', visibility: 'members'});
        await visit(`/editor/post/${post.id}`);
        await click('[data-test-button="publish-flow"]');
        await click('[data-test-button="continue"]');

        expect(find('[data-test-email-audience]').textContent).to.contain('Members');
        expect(find('[data-test-checkbox="upsell-free"]')).to.not.exist;
        expect(find('[data-test-no-preview-hint]')).to.not.exist;
    });
});
