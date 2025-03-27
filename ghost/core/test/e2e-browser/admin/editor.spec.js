const test = require('../fixtures/ghost-test');
const EditorPage = require('../utils/pages/EditorPage');

test.describe('Editor', () => {
    test.describe('Saving behavior', () => {
        test('should save a draft when only the title is changed and the input is blurred', async ({page}) => {
            const editorPage = new EditorPage(page);
            await editorPage.goto();
            await editorPage.setTitle('Hello world', {blur: true});
            await editorPage.waitForCreatePostResponse();
            await editorPage.checkPostStatus('Draft');
        });
        
        test('should save a draft when only the content is changed for the first time', async ({page}) => {
            const editorPage = new EditorPage(page);
            await editorPage.goto();
            await editorPage.setBody('Hello world', {triggerAutosave: true});
            await editorPage.waitForCreatePostResponse();
            await editorPage.checkPostStatus('Draft');
        });
    });
});