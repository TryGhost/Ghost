import {authenticateSession} from 'ember-simple-auth/test-support';
import {click, currentURL, fillIn, find, findAll} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Settings - Newsletters (multipleNewslettersUI)', function () {
    const hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures('configs');

        const role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role]});

        enableLabsFlag(this.server, 'multipleNewsletters');
        enableLabsFlag(this.server, 'multipleNewslettersUI');

        return await authenticateSession();
    });

    it('redirects old path', async function () {
        await visit('/settings/members-email');
        expect(currentURL()).to.equal('/settings/newsletters');
    });

    it('can manage open rate tracking', async function () {
        this.server.db.settings.update({key: 'email_track_opens'}, {value: 'true'});

        await visit('/settings/newsletters');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.be.checked;

        await click('[data-test-label="email-track-opens"]');
        expect(find('[data-test-checkbox="email-track-opens"]')).to.not.be.checked;

        await click('[data-test-button="save-members-settings"]');

        expect(this.server.db.settings.findBy({key: 'email_track_opens'}).value).to.equal(false);
    });

    async function checkValidationError(regexp) {
        // Create the newsletter
        await click('[data-test-button="save-newsletter"]');

        expect(findAll('.error > .response').length, 'error message is displayed').to.equal(1);
        expect(find('.error > .response').textContent).to.match(regexp);

        // Check button is in error state
        expect(find('[data-test-button="save-newsletter"] > [data-test-task-button-state="failure"]')).to.exist;
    }

    async function checkSave(options) {
        const name = options.edit ? 'edit' : 'create';

        // Create the newsletter
        await click('[data-test-button="save-newsletter"]');

        // No errors
        expect(findAll('.error > .response').length, 'error message is displayed').to.equal(0);

        if (options.shouldVerifyEmail) {
            expect(find('[data-test-modal="confirm-newsletter-email"]'), 'Confirm email modal').to.exist;
            await click('[data-test-button="confirm-newsletter-email"]');
        }

        // Check if modal closes on save
        expect(find(`[data-test-modal="${name}-newsletter"]`), 'Newsletter modal should disappear after saving').to.not.exist;
    }

    async function fillName(name) {
        await fillIn('input#newsletter-title', name);
    }

    it('can create new newsletter', async function () {
        await visit('/settings/newsletters');
        await click('[data-test-button="add-newsletter"]');

        // Check if modal opens
        expect(find('[data-test-modal="create-newsletter"]'), 'Create newsletter modal').to.exist;

        // Fill in the newsletter name
        await fillName('My new newsletter');

        // Fill in the newsletter description
        await fillIn('textarea#newsletter-description', 'My newsletter description');

        await checkSave({});
    });

    it('validates create newsletter before saving', async function () {
        await visit('/settings/newsletters');
        await click('[data-test-button="add-newsletter"]');

        // Check if modal opens
        expect(find('[data-test-modal="create-newsletter"]'), 'Create newsletter modal').to.exist;

        // Invalid name error when you try to save
        await checkValidationError(/Please enter a name./);

        // Fill in the newsletter name
        await fillName('My new newsletter');

        // Everything should be valid
        await checkSave({});
    });

    /*it('validates edit fields before saving', async function () {
        await visit('/settings/newsletters');

        // This one is only needed because we already created a second newsletter in previous test
        await click('[data-test-newsletter-menu-trigger]');
        await click('[data-test-button="customize-newsletter"]');

        // Check if modal opens
        expect(find('[data-test-modal="edit-newsletter"]'), 'Edit newsletter modal').to.exist;

        // Invalid name error when you try to save
        await checkValidationError(/Please enter a name./);

        // Fill in the newsletter name
        await fillName('My new newsletter');

        // Enter an invalid email
        await fillIn('input#newsletter-sender-email', 'invalid-email');

        // Check if it complains about the invalid email
        await checkValidationError(/Invalid email./);

        await fillIn('input#newsletter-sender-email', 'valid-email@email.com');

        // Everything should be valid
        await checkSave({
            edit: true,
            shouldVerifyEmail: true
        });
    });*/
});
