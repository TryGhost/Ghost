import loginAsRole from '../../helpers/login-as-role';
import {click, currentURL, find} from '@ember/test-helpers';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Feature Image', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();
        await loginAsRole('Administrator', this.server);
    });

    it('can display feature image with caption', async function () {
        const post = this.server.create('post', {status: 'published', featureImage: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg', featureImageCaption: '<span style="white-space: pre-wrap;">Hello dogggos</span>'});
        await visit(`/editor/post/${post.id}`);
        expect(await find('.gh-editor-feature-image img').src).to.equal('https://static.ghost.org/v4.0.0/images/feature-image.jpg');
        expect(await find('.gh-editor-feature-image-caption').textContent).to.contain('Hello dogggos');
    });

    it('does not enable update button when a feature image caption is loaded from the API', async function () {
        const post = this.server.create('post', {
            status: 'published',
            featureImage: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg',
            featureImageCaption: 'Feature image caption from the API'
        });

        await visit(`/editor/post/${post.id}`);

        expect(find('.gh-editor-feature-image-caption')).to.have.rendered.text('Feature image caption from the API');
        expect(find('[data-test-button="publish-save"]').disabled).to.be.true;
    });

    it('generates and replaces feature image alt text when Claude is configured', async function () {
        const post = this.server.create('post', {
            status: 'published',
            featureImage: '/content/images/feature-image.jpg',
            featureImageAlt: 'Existing alt text'
        });
        this.server.create('setting', {key: 'claude_api_key', value: '••••••••', group: 'claude'});
        let requestBody;
        this.server.post('/images/alt-text/', function (schema, request) {
            requestBody = JSON.parse(request.requestBody);
            return {alt_text: 'A dog running through long grass.'};
        });

        await visit(`/editor/post/${post.id}`);
        await click('[title="Toggle between editing alt text and caption"]');
        await click('[data-test-button="generate-feature-image-alt"]');

        expect(requestBody).to.deep.equal({image_url: '/content/images/feature-image.jpg'});
        expect(find('[aria-label="Alt text for feature image"]').value).to.equal('A dog running through long grass.');
    });

    it('does not attempt to save if already deleted and goes back to posts', async function () {
        // avoids an infinite loop when the post is deleted and the save button is clicked, potential race condition
        const post = this.server.create('post', {status: 'published', featureImage: 'https://static.ghost.org/v4.0.0/images/feature-image.jpg', featureImageCaption: '<span style="white-space: pre-wrap;">Hello dogggos</span>'});
        await visit(`/editor/post/${post.id}`);

        this.server.db.posts.update(post.id, {isDeleted: true});

        await click('[data-test-psm-trigger]');
        await click('[data-test-button="delete-post"]');
        await click('[data-test-button="delete-post-confirm"]');

        expect(currentURL()).to.equal('/posts');
    });
});
