import type { EditorResource, FullPost } from "@tryghost/admin-x-framework/api/editor";
import { isAuthorOrContributor, isContributorUser, type User } from "@tryghost/admin-x-framework/api/users";

/**
 * Permissions gate ported from Ember's edit route afterModel
 * (ghost/admin/app/routes/lexical-editor/edit.js lines 48-65): the API
 * returns any post even when the signed-in user can't edit it, so the client
 * must check itself. Authors and contributors may only open their OWN posts,
 * and contributors additionally only DRAFTS. Returns the route to redirect
 * to ('/posts' or '/pages', mirroring Ember's `replaceWith(returnRoute)`),
 * or null when access is allowed (or not yet decidable).
 */
export function getEditorAccessRedirect(
    user: User | null | undefined,
    post: Pick<FullPost, "status" | "authors"> | null | undefined,
    resource: EditorResource,
): string | null {
    if (!user || !post) {
        return null;
    }

    const returnRoute = `/${resource}`;
    const isAuthoredByUser = (post.authors ?? []).some(author => author.id === user.id);

    if (isAuthorOrContributor(user) && !isAuthoredByUser) {
        return returnRoute;
    }

    if (isContributorUser(user) && post.status !== "draft") {
        return returnRoute;
    }

    return null;
}
