import {CommentFactory, MemberFactory, PostFactory, createCommentFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {CommentsPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

const useReactShell = process.env.USE_REACT_SHELL === 'true';

test.describe('Ghost Admin - Comment Moderation', () => {
    test.skip(!useReactShell, 'Skipping: requires USE_REACT_SHELL=true');

    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let commentFactory: CommentFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);

        const settingsService = new SettingsService(page.request);
        await settingsService.setCommentsEnabled('all');
    });

    test.describe('with commentPermalinks disabled', () => {
        test.use({labs: {commentModeration: true, commentPermalinks: false}});

        test('view post action navigates to post', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment without permalink</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Test comment without permalink');
            await commentsPage.openMoreMenu(commentRow);

            const popupPromise = page.waitForEvent('popup');
            await commentsPage.getViewPostMenuItem().click();
            const postPage = await popupPromise;

            await expect(postPage).toHaveURL(new RegExp(`/${post.slug}/`));
            expect(postPage.url()).not.toContain('#ghost-comments-');
        });
    });

    test.describe('with commentPermalinks enabled', () => {
        test.use({labs: {commentModeration: true, commentPermalinks: true}});

        test('view on post action navigates to comment permalink', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            const comment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment with permalink</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Test comment with permalink');
            await commentsPage.openMoreMenu(commentRow);

            const popupPromise = page.waitForEvent('popup');
            await commentsPage.getViewOnPostMenuItem().click();
            const postPage = await popupPromise;

            await expect(postPage).toHaveURL(new RegExp(`/${post.slug}/.*#ghost-comments-${comment.id}`));
        });
    });
});
