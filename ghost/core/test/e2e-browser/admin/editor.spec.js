const test = require('../fixtures/ghost-test');
const EditorPage = require('../utils/pages/EditorPage');

test.describe('Editor', () => {
    test.describe('Saving behavior', () => {
        test('should save a draft when only the title is changed for the first time', async ({page}) => {
            const editorPage = new EditorPage(page);
            await editorPage.goto();
            await editorPage.typeInTitle('Hello world');
            await editorPage.checkPostStatus('Draft');
        });
        
        test('should save a draft when only the content is changed for the first time', async ({page}) => {
            const editorPage = new EditorPage(page);
            await editorPage.goto();
            await editorPage.typeInEditor('Hello world');
            await editorPage.checkPostStatus('Draft');
        });
    });
});