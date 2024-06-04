import loginAsRole from '../../helpers/login-as-role';
import moment from 'moment-timezone';
import {click, find, findAll} from '@ember/test-helpers';
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
            status: 'draft'
        });
        this.server.create('post-revision', {
            post,
            title: post.title,
            featureImage: post.featureImage,
            featureImageAlt: post.featureImageAlt,
            featureImageCaption: post.featureImageCaption,
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'hour'),
            reason: 'explicit_save'
        });
        this.server.create('post-revision', {
            post,
            title: 'Old Title',
            featureImage: post.featureImage,
            featureImageAlt: post.featureImageAlt,
            featureImageCaption: post.featureImageCaption,
            postStatus: 'draft',
            author: post.authors.models[0],
            createdAt: moment(post.updatedAt).subtract(1, 'day'),
            reason: 'initial_revision'
        });

        // this.timeout(0);

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
    });
});
