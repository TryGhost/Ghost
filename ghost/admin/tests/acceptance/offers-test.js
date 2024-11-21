// import moment from 'moment-timezone';
// import {authenticateSession, invalidateSession} from 'ember-simple-auth/test-support';
// import {beforeEach, describe, it} from 'mocha';
// import {blur, click, currentURL, fillIn, find, findAll, settled} from '@ember/test-helpers';
// import {enablePaidMembers} from '../helpers/members';
// import {expect} from 'chai';
// import {setupApplicationTest} from 'ember-mocha';
// import {setupMirage} from 'ember-cli-mirage/test-support';
// import {timeout} from 'ember-concurrency';
// import {visit} from '../helpers/visit';

// describe('Acceptance: Offers', function () {
//     let hooks = setupApplicationTest();
//     setupMirage(hooks);

//     it('redirects to signin when not authenticated', async function () {
//         await invalidateSession();
//         await visit('/offers');

//         expect(currentURL()).to.equal('/signin');
//     });

//     it('redirects non-admins to site', async function () {
//         let role = this.server.create('role', {name: 'Editor'});
//         this.server.create('user', {roles: [role]});

//         await authenticateSession();
//         await visit('/offers');

//         expect(currentURL()).to.equal('/site');
//         expect(find('[data-test-nav="offers"]'), 'sidebar link')
//             .to.not.exist;
//     });

//     describe('as owner', function () {
//         beforeEach(async function () {
//             this.server.loadFixtures('tiers');

//             let role = this.server.create('role', {name: 'Owner'});
//             this.server.create('user', {roles: [role]});

//             enablePaidMembers(this.server);

//             await authenticateSession();
//         });

//         it('it renders, can be navigated, can edit offer', async function () {
//             const tier = this.server.create('tier');
//             let offer1 = this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(1, 'day').valueOf()});
//             this.server.create('offer', {tier: {id: tier.id}, createdAt: moment.utc().subtract(2, 'day').valueOf()});

//             await visit('/offers');

//             await settled();

//             // lands on correct page
//             expect(currentURL(), 'currentURL').to.equal('/offers');

//             // it highlights active state in nav menu
//             expect(
//                 find('[data-test-nav="offers"]'),
//                 'highlights nav menu item'
//             ).to.have.class('active');

//             // it lists all offers
//             expect(findAll('[data-test-list="offers-list-item"]').length, 'offers list count')
//                 .to.equal(2);

//             let offer = find('[data-test-list="offers-list-item"]');
//             expect(offer.querySelector('[data-test-list="offer-name"] h3').textContent, 'offer list item name')
//                 .to.equal(offer1.name);

//             await visit(`/offers/${offer1.id}`);

//             // second wait is needed for the offer details to settle
//             await settled();

//             // it shows selected offer form
//             expect(find('[data-test-input="offer-name"]').value, 'loads correct offer into form')
//                 .to.equal(offer1.name);

//             // it maintains active state in nav menu
//             expect(
//                 find('[data-test-nav="offers"]'),
//                 'highlights nav menu item'
//             ).to.have.class('active');

//             // trigger save
//             await fillIn('[data-test-input="offer-name"]', 'New Name');
//             await blur('[data-test-input="offer-name"]');

//             await click('[data-test-button="save"]');

//             // extra timeout needed for Travis - sometimes it doesn't update
//             // quick enough and an extra wait() call doesn't help
//             await timeout(100);

//             await click('[data-test-link="offers-back"]');

//             // lands on correct page
//             expect(currentURL(), 'currentURL').to.equal('/offers');
//         });

//         it('maintains active state in nav menu when creating a new tag', async function () {
//             await visit('offers/new');
//             expect(currentURL()).to.equal('offers/new');
//             expect(find('[data-test-nav="offers"]'), 'highlights nav menu item')
//                 .to.have.class('active');
//         });
//     });
// });
