import {authenticateSession} from 'ember-simple-auth/test-support';
import {beforeEach, describe, it} from 'mocha';
import {click} from '@ember/test-helpers';
import {expect} from 'chai';
import {find, visit} from '@ember/test-helpers';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';

describe('Acceptance: Restore', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        // Create a user and authenticate the session
        let role = this.server.create('role', {name: 'Owner'});
        this.server.create('user', {roles: [role], slug: 'owner'});
        await authenticateSession();
    });

    it('restores a post from a revision', async function () {
        // Create a post revision in localStorage
        const revisionData = {
            id: 'test-id',
            title: 'Test Post',
            lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Test content","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
            revisionTimestamp: Date.now()
        };
        const revisionKey = `post-revision-${revisionData.id}-${revisionData.revisionTimestamp}`;
        localStorage.setItem(revisionKey, JSON.stringify(revisionData));
        localStorage.setItem('ghost-revisions', JSON.stringify([revisionKey]));

        // Visit the restore route
        await visit(`/restore/`);

        // Verify that the post title is displayed
        const postTitle = find('[data-test-id="restore-post-title"]').textContent.trim();
        expect(postTitle).to.equal('Test Post');

        // Verify that the restore button is present
        const restoreButton = find('[data-test-id="restore-post-button"]');
        expect(restoreButton).to.exist;

        // Click the restore button
        await click(restoreButton);

        // Verify that the post is restored (notification will show)
        expect(find('.gh-notification-title').textContent.trim()).to.equal('Post restored successfully');
    });
});