import {Page} from '@playwright/test';
import {PostEditorPage, PostsPage} from '@/admin-pages';

export interface DraftPostInput {
    title: string;
    body: string;
}

export interface DraftPostResult {
    editor: PostEditorPage;
    postPath: string;
}

/**
 * Creates a post draft via the Posts screen and returns the editor plus URL path.
 */
export async function createDraftPost(page: Page, {title, body}: DraftPostInput): Promise<DraftPostResult> {
    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft({title, body});
    const postPath = await editor.getPostPath();

    return {editor, postPath};
}
