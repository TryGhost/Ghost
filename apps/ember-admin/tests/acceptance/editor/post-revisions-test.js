import loginAsRole from '../../helpers/login-as-role';
import moment from 'moment-timezone';
import {click, find, findAll} from '@ember/test-helpers';
import {enableLabsFlag} from '../../helpers/labs-flag';
import {expect} from 'chai';
import {setupApplicationTest} from 'ember-mocha';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {visit} from '../../helpers/visit';

describe('Acceptance: Post revisions', function () {
    let hooks = setupApplicationTest();
    setupMirage(hooks);

    beforeEach(async function () {
        this.server.loadFixtures();

        await loginAsRole('Administrator', this.server);
    });

    it('can restore a draft post revision', async function () {
        const post = this.server.create('post', {
            title: 'Current Title',
            customExcerpt: 'Current excerpt',
            status: 'draft'
        });
        this.server.create('post-revision', {
            post,
            title: post.title,
            customExcerpt: 'New excerpt',
            featureImage: 'https://example.com/new-image.jpg',
            featureImageAlt: 'New feature alt text',
            featureImageCaption: 'New feature caption',
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'hour'),
            reason: 'explicit_save',
            lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"New body","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
        });
        this.server.create('post-revision', {
            post,
            title: 'Old Title',
            customExcerpt: 'Old excerpt',
            featureImage: 'https://example.com/old-image.jpg',
            featureImageAlt: 'Old feature alt text',
            featureImageCaption: 'Old feature caption',
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'day'),
            reason: 'initial_revision',
            lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Old body","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
        });

        await visit(`/editor/post/${post.id}`);

        // open post history menu
        await click('[data-test-psm-trigger]');
        await click('[data-test-toggle="post-history"]');

        // latest and previous post listed
        expect(findAll('[data-test-revision-item]').length).to.equal(2);
        expect(find('[data-test-revision-item="0"]')).to.contain.trimmed.text('19 Oct 2015, 15:25');
        expect(find('[data-test-revision-item="0"] [data-test-revision-latest]')).to.exist;

        expect(find('[data-test-revision-item="1"]')).to.contain.trimmed.text('18 Oct 2015, 16:25');
        expect(find('[data-test-revision-item="1"] [data-test-revision-latest]')).to.not.exist;

        // latest post is previewed by default
        expect(find('[data-test-post-history-preview-title]')).to.have.trimmed.text('Current Title');
        expect(find('[data-test-post-history-preview-feature-image]')).to.have.attribute('src', 'https://example.com/new-image.jpg');
        expect(find('[data-test-post-history-preview-feature-image]')).to.have.attribute('alt', 'New feature alt text');
        expect(find('[data-test-post-history-preview-feature-image-caption]')).to.have.trimmed.text('New feature caption');

        // excerpt is not visible (needs feature flag)
        expect(find('[data-test-post-history-preview-excerpt]')).to.not.exist;

        // previous post can be previewed
        await click('[data-test-revision-item="1"] [data-test-button="preview-revision"]');
        expect(find('[data-test-post-history-preview-title]')).to.have.trimmed.text('Old Title');

        // previous post can be restored
        expect(find('[data-test-revision-item="1"] [data-test-button="restore-revision"]')).to.exist;
        await click('[data-test-revision-item="1"] [data-test-button="restore-revision"]');
        expect(find('[data-test-modal="restore-revision"]')).to.exist;
        await click('[data-test-modal="restore-revision"] [data-test-button="restore"]');
        expect(find('[data-test-modal="restore-revision"]')).to.not.exist;
        expect(find('[data-test-editor-title-input]')).to.have.value('Old Title');
        // post has been saved with correct data
        expect(post.attrs.title).to.equal('Old Title');
        expect(post.attrs.featureImage).to.equal('https://example.com/old-image.jpg');
        expect(post.attrs.featureImageAlt).to.equal('Old feature alt text');
        expect(post.attrs.featureImageCaption).to.equal('Old feature caption');

        // excerpt (customExcerpt) is not restored (needs feature flag)
        expect(post.attrs.customExcerpt).to.equal('Current excerpt');
    });

    it('can preview and restore excerpt (with editorExcerpt feature flag)', async function () {
        enableLabsFlag(this.server, 'editorExcerpt');

        const post = this.server.create('post', {
            title: 'Current Title',
            customExcerpt: 'Current excerpt',
            status: 'draft'
        });
        this.server.create('post-revision', {
            post,
            title: post.title,
            customExcerpt: 'New excerpt',
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'hour'),
            reason: 'explicit_save',
            lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"New body","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
        });
        this.server.create('post-revision', {
            post,
            title: 'Old Title',
            customExcerpt: 'Old excerpt',
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'day'),
            reason: 'initial_revision',
            lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Old body","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
        });

        await visit(`/editor/post/${post.id}`);

        // open post history menu
        await click('[data-test-psm-trigger]');
        await click('[data-test-toggle="post-history"]');

        // excerpt is visible
        expect(find('[data-test-post-history-preview-excerpt]')).to.exist;
        expect(find('[data-test-post-history-preview-excerpt]')).to.have.trimmed.text('New excerpt');

        // previous post can be previewed
        await click('[data-test-revision-item="1"] [data-test-button="preview-revision"]');
        expect(find('[data-test-post-history-preview-excerpt]')).to.have.trimmed.text('Old excerpt');

        // previous post can be restored
        await click('[data-test-revision-item="1"] [data-test-button="restore-revision"]');
        await click('[data-test-modal="restore-revision"] [data-test-button="restore"]');

        // post has been saved with correct data
        expect(post.attrs.customExcerpt).to.equal('Old excerpt');
    });

    it('reverts to current post excerpt if revision excerpt is missing (with editorExcerpt feature flag)', async function () {
        enableLabsFlag(this.server, 'editorExcerpt');

        const post = this.server.create('post', {
            title: 'Current Title',
            customExcerpt: 'Current excerpt',
            status: 'draft'
        });
        this.server.create('post-revision', {
            post,
            title: post.title,
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'hour'),
            reason: 'explicit_save'
        });
        this.server.create('post-revision', {
            post,
            title: 'Old Title',
            customExcerpt: null,
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'day'),
            reason: 'initial_revision'
        });

        await visit(`/editor/post/${post.id}`);

        // open post history menu
        await click('[data-test-psm-trigger]');
        await click('[data-test-toggle="post-history"]');

        // latest excerpt is set to current
        expect(find('[data-test-post-history-preview-excerpt]')).to.exist;
        expect(find('[data-test-post-history-preview-excerpt]')).to.have.trimmed.text('Current excerpt');

        // previous post can be previewed and excerpt is set to current
        await click('[data-test-revision-item="1"] [data-test-button="preview-revision"]');
        expect(find('[data-test-post-history-preview-excerpt]')).to.have.trimmed.text('Current excerpt');

        // restore saves current excerpt
        await click('[data-test-revision-item="1"] [data-test-button="restore-revision"]');
        await click('[data-test-modal="restore-revision"] [data-test-button="restore"]');

        // post has been saved with correct data
        expect(post.attrs.customExcerpt).to.equal('Current excerpt');
    });
});
