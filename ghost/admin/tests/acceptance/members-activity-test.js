import moment from 'moment-timezone';
import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, find, findAll} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../helpers/visit';

describe('Acceptance: Members activity', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    it('redirects when not authenticated', async function () {
        await invalidateSession();
        await visit('/members-activity');
        expect(currentURL()).to.equal('/signin');
    });

    it('redirects roles w/o manage members permission', async function () {
        await invalidateSession();

        const role = this.server.create('role', {name: 'Editor'});
        this.server.create('user', {roles: [role], slug: 'test-user'});

        await authenticateSession();
        await visit('/members-activity');
        expect(currentURL()).to.equal('/site');
    });

    describe('as admin', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Administrator'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });
    });
    describe('as super editor', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Super Editor'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });
    });
    describe('as owner', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Owner'});
            this.server.create('user', {roles: [role]});

            await authenticateSession();
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });
    });

    describe('members activity filter', function () {
        beforeEach(async function () {
            const role = this.server.create('role', {name: 'Administrator'});
            await this.server.create('user', {roles: [role]});

            await authenticateSession();

            // create 1 member with id 1
            this.server.create('member', {id: 1, name: 'Member 1', email: '', status: 'free'});

            // create an event for member 1
            this.server.create('member-activity-event', {memberId: 1, createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss'), type: 'payment_event'});
            this.server.create('member-activity-event', {memberId: 1, createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss'), type: 'subscription_event'});
            this.server.create('member-activity-event', {memberId: 1, createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss'), type: 'donation_event'});
        });

        it('renders', async function () {
            await visit('/members-activity');
            expect(currentURL()).to.equal('/members-activity');
        });

        it('lists all events', async function () {
            await visit('/members-activity');
            expect(findAll('.gh-members-activity-event').length).to.equal(3);
        });

        it('filters events payment and donation events', async function () {
            await visit('/members-activity?excludedEvents=payment_event%2Cdonation_event');
            expect(findAll('.gh-members-activity-event').length).to.equal(1);
        });

        it('includes one time (donation) payments under payments filtering', async function () {
            await visit('/members-activity');
            await click('[data-test-id="filter-events-button"]');
            await click('[data-test-id="event-type-filter-checkbox-payment_event"]');
            expect(findAll('.gh-members-activity-event').length).to.equal(1);
        });

        it('has a donation event with attribution from homepage and has a dash', async function () {
            this.server.create('member-activity-event', {
                memberId: 1,
                createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss'),
                type: 'donation_event',
                data: {
                    amount: 500000, // or whatever amount you want to test with
                    currency: 'krw',
                    attribution: {
                        title: 'homepage',
                        url: 'https://example.com'
                    }
                }
            });

            await visit('/members-activity');

            const events = findAll('.gh-members-activity-event');

            let donationEvent = null;
            for (let event of events) {
                if (event.textContent.includes('homepage')) {
                    donationEvent = event;
                    break;
                }
            }

            donationEvent = find('.gh-members-activity-event-join');

            expect(donationEvent.textContent).to.include('–');
        });

        it('has a donation event without attribution and does not contain a dash', async function () {
            this.server.create('member-activity-event', {
                memberId: 1,
                createdAt: moment('2024-08-18 08:18:08').format('YYYY-MM-DD HH:mm:ss'),
                type: 'donation_event',
                data: {
                    amount: 500000, // or whatever amount you want to test with
                    currency: 'krw'
                }
            });

            await visit('/members-activity');

            const events = findAll('.gh-members-activity-event');

            const donationEventWithoutAttribution = events[0];

            expect(donationEventWithoutAttribution).to.exist;

            expect(donationEventWithoutAttribution.textContent).to.not.include('–');
        });
    });
});
