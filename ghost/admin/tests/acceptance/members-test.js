import moment from 'moment-timezone';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {blur, click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Members', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects to signin when not authenticated', async function () {
        await invalidateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/signin');
    });

    it('redirects non-admins to site', async function () {
        let role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role]});

        await authenticateSession();
        await visit('/members');

        expect(currentURL()).to.equal('/site');
        expect(find('[data-test-nav="members"]'), 'sidebar link')
            .to.not.exist;
    });

    describe('as owner', function () {
        beforeEach(async function () {
            this.server.loadFixtures('configs');

            let role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('it renders, can be navigated, can edit member', async function () {
            let member1 = this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')});
            this.server.create('member', {createdAt: moment.utc().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(2);

            // it highlights active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

            let member = find('[data-test-list="members-list-item"]');
            expect(member.querySelector('.gh-members-list-name').textContent, 'member list item title')
                .to.equal(member1.name);

            // it does not add ?include=email_recipients
            const membersRequests = this.server.pretender.handledRequests.filter(r => r.url.match(/\/members\/(\?|$)/));
            expect(membersRequests[0].url).to.not.have.string('email_recipients');

            await visit(`/members/${member1.id}`);

            // it shows selected member form
            expect(find('[data-test-input="member-name"]').value, 'loads correct member into form')
                .to.equal(member1.name);

            expect(find('[data-test-input="member-email"]').value, 'loads correct email into form')
                .to.equal(member1.email);

            // it maintains active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

            // trigger save
            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await click('[data-test-button="save"]');

            await click('[data-test-link="members-back"]');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');
        });

        it('can create a new member', async function () {
            this.server.create('member', {createdAt: moment.utc().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')});

            await visit('/members');

            // lands on correct page
            expect(currentURL(), 'currentURL').to.equal('/members');

            // it lists all members
            expect(findAll('[data-test-list="members-list-item"]').length, 'members list count')
                .to.equal(1);

            //  start new member
            await click('[data-test-new-member-button="true"]');

            // it navigates to the new member route
            expect(currentURL(), 'new member URL').to.equal('/members/new');
            // it displays the new member form
            expect(find('.gh-canvas-header h2').textContent, 'settings pane title')
                .to.contain('New');

            // it highlights active state in nav menu
            expect(
                find('[data-test-nav="members"]'),
                'highlights nav menu item'
            ).to.have.class('active');

            // all fields start blank
            findAll('.gh-member-settings-primary .gh-input').forEach(function (elem) {
                expect(elem.value, `input field for ${elem.getAttribute('name')}`)
                    .to.be.empty;
            });

            // save new member
            await fillIn('[data-test-input="member-name"]', 'New Name');
            await blur('[data-test-input="member-name"]');

            await fillIn('[data-test-input="member-email"]', 'example@domain.com');
            await blur('[data-test-input="member-email"]');

            await click('[data-test-button="save"]');

            expect(find('[data-test-input="member-name"]').value, 'name has been preserved')
                .to.equal('New Name');

            expect(find('[data-test-input="member-email"]').value, 'email has been preserved')
                .to.equal('example@domain.com');
        });

        /* Due to a limitation with NQL when multiple member filters are used in combination, we currently have a safeguard around member bulk deletion.
        *  Member bulk deletion is not permitted when:
        *   1) Multiple newsletters exist, and 2 or more newsletter filters are in use
        *   2) If any of the following Stripe filters are used, even once:
        *     - Billing period
        *     - Stripe subscription status
        *     - Paid start date
        *     - Next billing date
        *     - Subscription started on post/page
        *     - Offers
        *
        * See code: ghost/admin/app/controllers/members.js:isBulkDeletePermitted
        * See issue https://linear.app/tryghost/issue/ENG-1484 for more context
        *
        * TODO: delete this block of tests once the guardrail has been removed
        */
        describe('[Temp] Guardrail against bulk deletion', function () {
            it('cannot bulk delete members if more than 1 newsletter filter is used', async function () {
                // Create two newsletters and members subscribed to 1 or 2 newsletters
                const newsletterOne = this.server.create('newsletter');
                const newsletterTwo = this.server.create('newsletter');
                this.server.createList('member', 2).forEach(member => member.update({newsletters: [newsletterOne], email_disabled: 0}));
                this.server.createList('member', 2).forEach(member => member.update({newsletters: [newsletterOne, newsletterTwo], email_disabled: 0}));

                await visit('/members');
                expect(findAll('[data-test-member]').length).to.equal(4);

                // The delete button should not be visible by default
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // Apply a first filter
                await click('[data-test-button="members-filter-actions"]');
                await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', `newsletters.slug:${newsletterOne.slug}`);
                await click(`[data-test-button="members-apply-filter"]`);

                expect(findAll('[data-test-member]').length).to.equal(4);
                expect(currentURL()).to.equal(`/members?filter=(newsletters.slug%3A${newsletterOne.slug}%2Bemail_disabled%3A0)`);

                // Bulk deletion is permitted
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.exist;

                // Apply a second filter
                await click('[data-test-button="members-filter-actions"]');
                await click('[data-test-button="add-members-filter"]');
                await fillIn('[data-test-members-filter="1"] [data-test-select="members-filter"]', `newsletters.slug:${newsletterTwo.slug}`);
                await click(`[data-test-button="members-apply-filter"]`);

                expect(findAll('[data-test-member]').length).to.equal(2);
                expect(currentURL()).to.equal(`/members?filter=(newsletters.slug%3A${newsletterOne.slug}%2Bemail_disabled%3A0)%2B(newsletters.slug%3A${newsletterTwo.slug}%2Bemail_disabled%3A0)`);

                // Bulk deletion is not permitted anymore
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;
            });

            it('can bulk delete members if a non-Stripe subscription filter is in use (member tier, status)', async function () {
                const tier = this.server.create('tier', {id: 'qwerty123456789'});
                this.server.createList('member', 2, {status: 'free'});
                this.server.createList('member', 2, {status: 'paid', tiers: [tier]});

                await visit('/members');
                expect(findAll('[data-test-member]').length).to.equal(4);

                // The delete button should not be visible by default
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 1) Membership tier filter: permitted
                await visit(`/members?filter=tier_id:[${tier.id}]`);
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.exist;

                // 2) Member status filter: permitted
                await visit('/members?filter=status%3Afree');
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.exist;
            });

            it('cannot bulk delete members if a Stripe subscription filter is in use', async function () {
                // Create free and paid members
                const tier = this.server.create('tier');
                const offer = this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(1, 'day').valueOf()});
                this.server.createList('member', 2, {status: 'free'});
                this.server.createList('member', 2, {status: 'paid'}).forEach(member => this.server.create('subscription', {member, planInterval: 'month', status: 'active', start_date: '2000-01-01T00:00:00.000Z', current_period_end: '2000-02-01T00:00:00.000Z', offer: offer, tier: tier}));
                this.server.createList('member', 2, {status: 'paid'}).forEach(member => this.server.create('subscription', {member, planInterval: 'year', status: 'active'}));

                await visit('/members');
                expect(findAll('[data-test-member]').length).to.equal(6);

                // The delete button should not be visible by default
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 1) Stripe billing period filter: not permitted
                await visit('/members?filter=subscriptions.plan_interval%3Amonth');
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 2) Stripe subscription status filter: not permitted
                await visit('/members?filter=subscriptions.status%3Aactive');
                expect(findAll('[data-test-member]').length).to.equal(4);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 3) Stripe paid start date filter: not permitted
                await visit(`/members?filter=subscriptions.start_date%3A>'1999-01-01%2005%3A59%3A59'`);
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 4) Next billing date filter: not permitted
                await visit(`/members?filter=subscriptions.current_period_end%3A>'2000-01-01%2005%3A59%3A59'`);
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;

                // 5) Offers redeemed filter: not permitted
                await visit('/members?filter=' + encodeURIComponent(`offer_redemptions:'${offer.id}'`));
                expect(findAll('[data-test-member]').length).to.equal(2);
                await click('[data-test-button="members-actions"]');
                expect(find('[data-test-button="delete-selected"]')).to.not.exist;
            });
        });

        it('can bulk delete members', async function () {
            // members to be kept
            this.server.createList('member', 6);

            // imported members to be deleted
            const label = this.server.create('label');
            this.server.createList('member', 5, {labels: [label]});

            await visit('/members');

            expect(findAll('[data-test-member]').length).to.equal(11);

            await click('[data-test-button="members-actions"]');

            expect(find('[data-test-button="delete-selected"]')).to.not.exist;

            // a filter is needed for the delete-selected button to show
            await click('[data-test-button="members-filter-actions"]');
            await fillIn('[data-test-members-filter="0"] [data-test-select="members-filter"]', 'label');
            await click('.gh-member-label-input input');
            await click(`[data-test-label-filter="${label.name}"]`);
            await click(`[data-test-button="members-apply-filter"]`);

            expect(findAll('[data-test-member]').length).to.equal(5);
            expect(currentURL()).to.equal(`/members?filter=label%3A%5B${label.slug}%5D`);

            await click('[data-test-button="members-actions"]');

            expect(find('[data-test-button="delete-selected"]')).to.exist;

            await click('[data-test-button="delete-selected"]');

            expect(find('[data-test-modal="delete-members"]')).to.exist;
            expect(find('[data-test-text="delete-count"]')).to.have.text('5 members');

            // ensure export endpoint gets hit with correct query params when deleting
            let exportQueryParams;
            this.server.get('/members/upload', (schema, request) => {
                exportQueryParams = request.queryParams;
            });

            await click('[data-test-button="confirm"]');

            expect(exportQueryParams).to.deep.equal({filter: 'label:[label-0]', limit: 'all'});

            expect(find('[data-test-text="deleted-count"]')).to.have.text('5 members');
            expect(find('[data-test-button="confirm"]')).to.not.exist;

            // members filter is reset
            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-member]').length).to.equal(6);

            await click('[data-test-button="close-modal"]');

            expect(find('[data-test-modal="delete-members"]')).to.not.exist;
        });

        it('can delete a member (via list)', async function () {
            const newsletter = this.server.create('newsletter');
            const label = this.server.create('label');
            this.server.createList('member', 2, {newsletters: [newsletter], labels: [label]});

            await visit('/members');

            expect(findAll('[data-test-member]').length).to.equal(2);

            await click('[data-test-member] a');

            expect(currentURL()).to.match(/members\/\d+/);

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');

            expect(find('[data-test-modal="delete-member"]')).to.exist;

            await click('[data-test-modal="delete-member"] [data-test-button="cancel"]');

            expect(currentURL()).to.match(/members\/\d+/);
            expect(find('[data-test-modal="delete-member"]')).to.not.exist;

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');
            await click('[data-test-modal="delete-member"] [data-test-button="confirm"]');

            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-modal]')).to.have.length(0);
            expect(findAll('[data-test-member]')).to.have.length(1);
        });

        it('can delete a member (via url)', async function () {
            const newsletter = this.server.create('newsletter');
            const label = this.server.create('label');
            const [memberOne] = this.server.createList('member', 2, {newsletters: [newsletter], labels: [label]});

            await visit(`/members/${memberOne.id}`);

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');

            expect(find('[data-test-modal="delete-member"]')).to.exist;

            await click('[data-test-modal="delete-member"] [data-test-button="cancel"]');

            expect(currentURL()).to.match(/members\/\d+/);
            expect(find('[data-test-modal="delete-member"]')).to.not.exist;

            await click('[data-test-button="member-actions"]');
            await click('[data-test-button="delete-member"]');
            await click('[data-test-modal="delete-member"] [data-test-button="confirm"]');

            expect(currentURL()).to.equal('/members');
            expect(findAll('[data-test-modal]')).to.have.length(0);
            expect(findAll('[data-test-member]')).to.have.length(1);
        });
    });
});
