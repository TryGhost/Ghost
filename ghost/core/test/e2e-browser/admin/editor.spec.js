const test = require('../fixtures/ghost-test');
const EditorPage = require('../utils/pages/EditorPage');

test.describe('Editor', () => {
    test('should save post when title is blank and only the content is changed', async ({page}) => {
        const editorPage = new EditorPage(page);
        await editorPage.goto();
        await editorPage.typeInBody('Hello world');
        await editorPage.checkPostStatus('Draft');
    });
});