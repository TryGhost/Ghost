import {MockedApi, initialize, waitEditorFocused} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Actions', async () => {
    let mockedApi: MockedApi;

    test.beforeEach(async () => {
        mockedApi = new MockedApi({});
        mockedApi.setMember({
            name: 'John Doe',
            expertise: 'Software development',
            avatar_image: 'https://example.com/avatar.jpg'
        });
    });

    test('Can like and unlike a comment', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            liked: true,
            count: {
                likes: 52
            }
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // Check like button is not filled yet
        const comment = frame.getByTestId('comment-component').nth(0);
        const likeButton = comment.getByTestId('like-button');
        await expect(likeButton).toHaveCount(1);

        const icon = likeButton.locator('svg');
        await expect(icon).not.toHaveClass(/fill/);
        await expect(likeButton).toHaveText('0');

        // Click button
        await likeButton.click();

        // Check not filled
        await expect(icon).toHaveClass(/fill/);
        await expect(likeButton).toHaveText('1');

        // Click button again
        await likeButton.click();

        await expect(icon).not.toHaveClass(/fill/);
        await expect(likeButton).toHaveText('0');

        // Check state for already liked comment
        const secondComment = frame.getByTestId('comment-component').nth(1);
        const likeButton2 = secondComment.getByTestId('like-button');
        await expect(likeButton2).toHaveCount(1);
        const icon2 = likeButton2.locator('svg');
        await expect(icon2).toHaveClass(/fill/);
        await expect(likeButton2).toHaveText('52');
    });

    test('Can reply to a comment', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });
        mockedApi.addComment({
            html: '<p>This is comment 2</p>',
            liked: true,
            count: {
                likes: 52
            }
        });
        mockedApi.addComment({
            html: '<p>This is comment 3</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        // Check like button is not filled yet
        const comment = frame.getByTestId('comment-component').nth(0);
        const replyButton = comment.getByTestId('reply-button');
        await expect(replyButton).toHaveCount(1);

        // Click button
        await replyButton.click();
        const editor = frame.getByTestId('form-editor');
        await expect(editor).toBeVisible();
        // Wait for focused
        await waitEditorFocused(editor);

        // Ensure form data is correct
        const form = frame.getByTestId('form');
        await expect(form.getByTestId('avatar-image')).toHaveAttribute('src', 'https://example.com/avatar.jpg');

        // Should not include the replying-to-reply indicator
        await expect(frame.getByTestId('replying-to')).not.toBeVisible();

        // Type some text
        await page.keyboard.type('This is a reply 123');
        await expect(editor).toHaveText('This is a reply 123');

        // Click reply button
        const submitButton = comment.getByTestId('submit-form-button');
        await submitButton.click();

        // Check total amount of comments increased
        await expect(frame.getByTestId('comment-component')).toHaveCount(4);
        await expect(frame.getByText('This is a reply 123')).toHaveCount(1);
    });

    test('Reply-to-reply action not shown without labs flag', async ({
        page
    }) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({
                    html: '<p>This is a reply to 1</p>'
                })
            ]
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const parentComment = frame.getByTestId('comment-component').nth(0);
        const replyComment = parentComment.getByTestId('comment-component').nth(0);

        expect(replyComment.getByTestId('reply-button')).not.toBeVisible();
    });

    async function testReplyToReply(mockedApi, page) {
        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            labs: {
                commentImprovements: true
            }
        });

        const parentComment = frame.getByTestId('comment-component').nth(0);
        const replyComment = parentComment.getByTestId('comment-component').nth(0);

        const replyReplyButton = replyComment.getByTestId('reply-button');
        await replyReplyButton.click();

        const editor = frame.getByTestId('form-editor').nth(1);
        await expect(editor).toBeVisible();
        await waitEditorFocused(editor);

        // Should indicate we're replying to a reply
        await expect(frame.getByTestId('replying-to')).toBeVisible();
        await expect(frame.getByTestId('replying-to')).toHaveText('reply to comment: This is a reply to 1');

        await page.keyboard.type('This is a reply to a reply');

        // give time for spinner to show
        mockedApi.setDelay(100);

        const submitButton = parentComment.getByTestId('submit-form-button');
        await submitButton.click();

        // Spinner is shown
        await expect(frame.getByTestId('button-spinner')).toBeVisible();
        await expect(frame.getByTestId('button-spinner')).not.toBeVisible();

        // Comment gets added and has correct contents
        await expect(frame.getByTestId('comment-component')).toHaveCount(3);
        await expect(frame.getByText('This is a reply to a reply')).toHaveCount(1);

        // Should indicate this was a reply to a reply
        await expect(frame.getByTestId('comment-in-reply-to')).toHaveText('This is a reply to 1');
    }

    test('Can reply to a reply', async ({page}) => {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            replies: [
                mockedApi.buildReply({
                    html: '<p>This is a reply to 1</p>'
                })
            ]
        });

        await testReplyToReply(mockedApi, page);
    });

    test('Can reply to a reply with a deleted parent comment', async function ({page}) {
        mockedApi.addComment({
            html: '<p>This is comment 1</p>',
            status: 'deleted',
            replies: [
                mockedApi.buildReply({
                    html: '<p>This is a reply to 1</p>'
                })
            ]
        });

        await testReplyToReply(mockedApi, page);
    });

    test('Can add expertise', async ({page}) => {
        mockedApi.setMember({name: 'John Doe', expertise: null});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const editor = frame.getByTestId('form-editor');
        await editor.click({force: true});
        await waitEditorFocused(editor);

        const expertiseButton = frame.getByTestId('expertise-button');
        await expect(expertiseButton).toBeVisible();
        await expect(expertiseButton).toHaveText('·Add your expertise');
        await expertiseButton.click();

        const detailsFrame = page.frameLocator('iframe[title="addDetailsPopup"]');
        const profileModal = detailsFrame.getByTestId('profile-modal');
        await expect(profileModal).toBeVisible();

        await expect(detailsFrame.getByTestId('name-input')).toHaveValue(
            'John Doe'
        );
        await expect(detailsFrame.getByTestId('expertise-input')).toHaveValue('');

        await detailsFrame.getByTestId('name-input').fill('Testy McTest');
        await detailsFrame
            .getByTestId('expertise-input')
            .fill('Software development');

        await detailsFrame.getByTestId('save-button').click();

        await expect(profileModal).not.toBeVisible();

        // playwright can lose focus on the editor which hides the member details,
        // re-clicking here brings the member details back into view
        await editor.click({force: true});
        await waitEditorFocused(editor);

        await expect(frame.getByTestId('member-name')).toHaveText('Testy McTest');
        await expect(frame.getByTestId('expertise-button')).toHaveText(
            '·Software development'
        );
    });

    test.describe('Sorting - flag needs to be enabled', () => {
        test('Renders Sorting Form dropdown', async ({page}) => {
            mockedApi.addComment({
                html: '<p>This is comment 1</p>'
            });
            mockedApi.addComment({
                html: '<p>This is comment 2</p>',
                liked: true,
                count: {
                    likes: 52
                }
            });
            mockedApi.addComment({
                html: '<p>This is comment 4</p>'
            });

            mockedApi.addComment({
                html: '<p>This is comment 5</p>'
            });

            mockedApi.addComment({
                html: '<p>This is comment 6</p>'
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const sortingForm = frame.getByTestId('comments-sorting-form');

            await expect(sortingForm).toBeVisible();
        });

        test('Default sorting is by Best', async ({page}) => {
            mockedApi.addComment({
                html: '<p>This is comment 1</p>',
                count: {
                    likes: 5
                },
                createdAt: '2021-01-01T00:00:00Z'
            });
            mockedApi.addComment({
                html: '<p>This is comment 2</p>',
                count: {
                    likes: 10
                },
                created_at: new Date('2023-01-01T00:00:00Z')
            });
            mockedApi.addComment({
                html: '<p>This is comment 3</p>',
                count: {
                    likes: 15
                },
                created_at: new Date('2022-02-01T00:00:00Z')
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const sortingForm = frame.getByTestId('comments-sorting-form');

            // Check default sorting is by Best

            await expect(sortingForm).toHaveText('Best');

            const comments = await frame.getByTestId('comment-component');

            await expect(comments.nth(0)).toContainText('This is comment 3');
        });
        test('Renders Sorting Form dropdown, with Best, Newest Oldest', async ({
            page
        }) => {
            mockedApi.addComment({
                html: '<p>This is comment 1</p>'
            });
            mockedApi.addComment({
                html: '<p>This is comment 2</p>',
                liked: true,
                count: {
                    likes: 52
                }
            });
            mockedApi.addComment({
                html: '<p>This is comment 4</p>'
            });

            mockedApi.addComment({
                html: '<p>This is comment 5</p>'
            });

            mockedApi.addComment({
                html: '<p>This is comment 6</p>'
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const sortingForm = frame.getByTestId('comments-sorting-form');

            await expect(sortingForm).toBeVisible();

            await sortingForm.click();

            const sortingDropdown = frame.getByTestId(
                'comments-sorting-form-dropdown'
            );
            await expect(sortingDropdown).toBeVisible();

            // check if inner options are visible

            const bestOption = sortingDropdown.getByText('Best');
            const newestOption = sortingDropdown.getByText('Newest');
            const oldestOption = sortingDropdown.getByText('Oldest');
            await expect(bestOption).toBeVisible();
            await expect(newestOption).toBeVisible();
            await expect(oldestOption).toBeVisible();
        });

        test('Sorts by Newest', async ({page}) => {
            mockedApi.addComment({
                html: '<p>This is the oldest</p>',
                created_at: new Date('2024-02-01T00:00:00Z')
            });
            mockedApi.addComment({
                html: '<p>This is comment 2</p>',
                created_at: new Date('2024-03-02T00:00:00Z')
            });
            mockedApi.addComment({
                html: '<p>This is the newest comment</p>',
                created_at: new Date('2024-04-03T00:00:00Z')
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const sortingForm = await frame.getByTestId('comments-sorting-form');

            await sortingForm.click();

            const sortingDropdown = await frame.getByTestId(
                'comments-sorting-form-dropdown'
            );

            const newestOption = await sortingDropdown.getByText('Newest');
            await newestOption.click();

            const comments = await frame.getByTestId('comment-component');

            await expect(comments.nth(0)).toContainText('This is the newest comment');
        });

        test('Sorts by oldest', async ({page}) => {
            mockedApi.addComment({
                html: '<p>This is the oldest</p>',
                created_at: new Date('2024-02-01T00:00:00Z')
            });
            mockedApi.addComment({
                html: '<p>This is comment 2</p>',
                created_at: new Date('2024-03-02T00:00:00Z')
            });
            mockedApi.addComment({
                html: '<p>This is the newest comment</p>',
                created_at: new Date('2024-04-03T00:00:00Z')
            });

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly',
                labs: {
                    commentImprovements: true
                }
            });

            const sortingForm = await frame.getByTestId('comments-sorting-form');

            await sortingForm.click();

            const sortingDropdown = await frame.getByTestId(
                'comments-sorting-form-dropdown'
            );

            const newestOption = await sortingDropdown.getByText('Oldest');
            await newestOption.click();

            const comments = await frame.getByTestId('comment-component');

            await expect(comments.nth(0)).toContainText('This is the oldest');
        });
    });
});
