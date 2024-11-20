import {FrameLocator, expect, test} from '@playwright/test';
import {MockedApi, initialize, waitEditorFocused} from '../utils/e2e';

test.describe('Autoclose forms', async () => {
    let mockedApi: MockedApi;
    let frame: FrameLocator;

    test.beforeEach(async ({page}) => {
        mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>Comment 1</p>',
            replies: [{
                html: '<p>Reply 1.1</p>'
            }, {
                html: '<p>Reply 1.2</p>'
            }]
        });
        mockedApi.addComment({
            html: '<p>Comment 2</p>'
        });

        ({frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher weekly',
            labs: {
                commentImprovements: true
            }
        }));
    });

    // NOTE: form counts are replies + 1 for the main form that is now always shown
    //       at the top of the comments list

    test('autocloses open reply forms when opening another', async ({}) => {
        const comment1 = await frame.getByTestId('comment-component').nth(0);
        await comment1.getByTestId('reply-button').click();

        await expect(frame.getByTestId('form')).toHaveCount(2);

        const comment2 = await frame.getByTestId('comment-component').nth(3);
        await comment2.getByTestId('reply-button').click();

        await expect(frame.getByTestId('form')).toHaveCount(2);
    });

    test('does not autoclose open reply form with unsaved changes', async ({}) => {
        const comment1 = await frame.getByTestId('comment-component').nth(0);
        await comment1.getByTestId('reply-button').click();

        await expect(frame.getByTestId('form')).toHaveCount(2);

        const editor = frame.getByTestId('form-editor').nth(1);
        await waitEditorFocused(editor);
        await editor.type('Replying to comment 1');

        const comment2 = await frame.getByTestId('comment-component').nth(3);
        await comment2.getByTestId('reply-button').click();

        await expect(frame.getByTestId('form')).toHaveCount(3);
    });
});
