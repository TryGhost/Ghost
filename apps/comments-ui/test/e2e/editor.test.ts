import {Locator, expect, test} from '@playwright/test';
import {MockedApi, getHeight, getModifierKey, initialize, selectText, setClipboard} from '../utils/e2e';

test.describe('Editor', async () => {
    test('Can comment on a post', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            count: true,
            title: 'Title'
        });

        await expect(frame.getByTestId('comment-component')).toHaveCount(1);
        await expect(frame.getByTestId('count')).toHaveText('1 comment');

        const editor = frame.getByTestId('form-editor');
        const editorHeight = await getHeight(editor);

        await editor.click({force: true});

        // Wait for animation to finish
        await page.waitForTimeout(200);
        const newEditorHeight = await getHeight(editor);

        expect(newEditorHeight).toBeGreaterThan(editorHeight);

        // Type in the editor
        await editor.type('Newly added comment');

        // Post the comment
        const button = await frame.getByTestId('submit-form-button');
        await button.click();

        // Check editor is empty
        await expect(editor).toHaveText('');

        // Check the comment is added to the view
        await expect(frame.getByTestId('comment-component')).toHaveCount(2);
        await expect(frame.getByTestId('count')).toHaveText('2 comments');

        await expect(frame.getByText('This is comment 1')).toBeVisible();
        await expect(frame.getByText('Newly added comment')).toBeVisible();
    });

    test('Can use C to focus editor', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly'
        });

        const editor = frame.getByTestId('form-editor');
        const editorHeight = await getHeight(editor);

        await page.keyboard.press('c');

        // Wait for animation to finish
        await page.waitForTimeout(200);
        const newEditorHeight = await getHeight(editor);

        expect(newEditorHeight).toBeGreaterThan(editorHeight);
    });

    test('Can use CMD+ENTER to submmit', async ({page}) => {
        const mockedApi = new MockedApi({});
        mockedApi.setMember({});

        mockedApi.addComment({
            html: '<p>This is comment 1</p>'
        });

        const {frame} = await initialize({
            mockedApi,
            page,
            publication: 'Publisher Weekly',
            count: true,
            title: 'Title'
        });

        await expect(frame.getByTestId('comment-component')).toHaveCount(1);
        await expect(frame.getByTestId('count')).toHaveText('1 comment');

        const editor = frame.getByTestId('form-editor');
        const editorHeight = await getHeight(editor);

        await editor.click({force: true});

        // Wait for animation to finish
        await page.waitForTimeout(200);
        const newEditorHeight = await getHeight(editor);

        expect(newEditorHeight).toBeGreaterThan(editorHeight);

        // Type in the editor
        await editor.type('Newly added comment');

        // Post the comment
        await page.keyboard.press(`${getModifierKey()}+Enter`);

        // Check editor is empty
        await expect(editor).toHaveText('');

        // Check the comment is added to the view
        await expect(frame.getByTestId('comment-component')).toHaveCount(2);
        await expect(frame.getByTestId('count')).toHaveText('2 comments');

        await expect(frame.getByText('This is comment 1')).toBeVisible();
        await expect(frame.getByText('Newly added comment')).toBeVisible();
    });

    test.describe('Markdown', () => {
        test('Can use > to type a quote', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({});

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const editor = frame.getByTestId('form-editor');

            await editor.click({force: true});

            // Type in the editor
            await editor.type('> This is a quote');
            await page.keyboard.press('Enter');
            await editor.type('This is a new line');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await editor.type('This is a new paragraph');

            // Post the comment
            await page.keyboard.press(`${getModifierKey()}+Enter`);

            await expect(editor).toHaveText('');

            // Check comment
            expect(mockedApi.comments).toHaveLength(1);
            expect(mockedApi.comments[0].html).toBe('<blockquote><p>This is a quote</p><p>This is a new line</p></blockquote><p>This is a new paragraph<br></p>');
        });

        test('Can paste an URL to create a link', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({});

            await setClipboard(page, 'https://www.google.com');
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const editor = frame.getByTestId('form-editor');

            await editor.click({force: true});

            // Check focused
            const editorEditable = frame.getByTestId('editor');
            await expect(editorEditable).toBeFocused();

            // Type in the editor
            await editor.type('Click here to go to a new page');

            // Select 'here'
            await selectText(editorEditable, /here/);
            await page.keyboard.press(`${getModifierKey()}+KeyV`);
            await page.waitForTimeout(200);

            // Click the button
            const button = await frame.getByTestId('submit-form-button');
            await button.click();

            await expect(editor).toHaveText('');

            // Check comment
            expect(mockedApi.comments).toHaveLength(1);
            expect(mockedApi.comments[0].html).toBe('<p>Click <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.google.com">here</a> to go to a new page</p>');
        });

        test('Can paste text without creating a url', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({});

            await setClipboard(page, 'Some random text');
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const editor = frame.getByTestId('form-editor');

            await editor.click({force: true});

            // Check focused
            const editorEditable = frame.getByTestId('editor');
            await expect(editorEditable).toBeFocused();

            // Type in the editor
            await editor.type('Click here to go to a new page');

            // Select 'here'
            await selectText(editorEditable, /here/);
            await page.keyboard.press(`${getModifierKey()}+KeyV`);
            await page.waitForTimeout(200);

            // Click the button
            const button = await frame.getByTestId('submit-form-button');
            await button.click();

            await expect(editor).toHaveText('');

            // Check comment
            expect(mockedApi.comments).toHaveLength(1);
            expect(mockedApi.comments[0].html).toBe('<p>Click Some random text to go to a new page</p>');
        });

        test('Cannot bold text', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({});

            await setClipboard(page, 'Some random text');
            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const editor = frame.getByTestId('form-editor');

            await editor.click({force: true});

            // Check focused
            const editorEditable = frame.getByTestId('editor');
            await expect(editorEditable).toBeFocused();

            // Type in the editor
            await editor.type('Click here to go to a new page');

            // Select 'here'
            await selectText(editorEditable, /here/);
            await page.keyboard.press(`${getModifierKey()}+B`);
            await page.waitForTimeout(200);

            // Click the button
            const button = await frame.getByTestId('submit-form-button');
            await button.click();

            await expect(editor).toHaveText('');

            // Check comment
            expect(mockedApi.comments).toHaveLength(1);
            expect(mockedApi.comments[0].html).toBe('<p>Click here to go to a new page</p>');
        });

        test('Can do a soft line break', async ({page}) => {
            const mockedApi = new MockedApi({});
            mockedApi.setMember({});

            const {frame} = await initialize({
                mockedApi,
                page,
                publication: 'Publisher Weekly'
            });

            const editor = frame.getByTestId('form-editor');

            await editor.click({force: true});

            // Check focused
            const editorEditable = frame.getByTestId('editor');
            await expect(editorEditable).toBeFocused();

            // Type in the editor
            await editor.type('This is line 1');
            await page.keyboard.press('Shift+Enter');
            await editor.type('This is line 2');
            await page.keyboard.press('Enter');
            await editor.type('This is a new paragraph');

            // Click the button
            const button = await frame.getByTestId('submit-form-button');
            await button.click();

            await expect(editor).toHaveText('');

            // Check comment
            expect(mockedApi.comments).toHaveLength(1);
            expect(mockedApi.comments[0].html).toBe('<p>This is line 1<br>This is line 2</p><p>This is a new paragraph</p>');
        });
    });
});

