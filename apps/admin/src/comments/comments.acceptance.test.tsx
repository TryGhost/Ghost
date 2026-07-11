import { describe, expect, it } from "vitest";

import {
    browseResponse,
    comment,
    currentRoute,
    fakeAdminEndpoint,
    fakeComments,
    renderAdminApp,
    type Comment,
} from "@test-utils/acceptance";
import { commentsScreen } from "./comments.screen";

/** The thread sidebar reads its selected comment from the read endpoint, which has no resource fake. */
function fakeCommentRead(entity: Comment): void {
    fakeAdminEndpoint("GET", new RegExp(`^/comments/${entity.id}/\\?`), { comments: [entity] });
}

describe("Comments deep linking", () => {
    it("filters to the linked comment and shows all comments on demand", async () => {
        const target = comment({ html: "<p>This is the target comment</p>" });
        const other = comment({ html: "<p>This is another comment</p>" });
        // The ?id deep link is the only filtered request this spec makes.
        const commentsApi = fakeComments(({ filter }) => (filter ? [target] : [target, other]));
        await renderAdminApp(`/comments?id=is:${target.id}`);

        await expect.element(commentsScreen.commentRow("This is the target comment")).toBeVisible();
        await expect(commentsApi).toHaveSentFilter(`id:'${target.id}'`);
        await expect(commentsScreen.commentRows()).toHaveCount(1);
        await expect.element(commentsScreen.filterButton()).not.toBeInTheDocument();
        await expect.element(commentsScreen.showAllButton()).toBeVisible();

        await commentsScreen.showAllButton().click();

        await expect.element(commentsScreen.commentRow("This is another comment")).toBeVisible();
        await expect(commentsScreen.commentRows()).toHaveCount(2);
        await expect.element(commentsScreen.filterButton()).toBeVisible();
        await expect.element(commentsScreen.showAllButton()).not.toBeInTheDocument();
    });
});

describe("Comments thread sidebar", () => {
    it("navigates within threads and shows the replied-to context", async () => {
        const root = comment({ html: "<p>Root comment</p>", count: { replies: 1, direct_replies: 1, likes: 0, dislikes: 0, reports: 0 } });
        const firstReply = comment({
            html: "<p>First level reply</p>",
            parent_id: root.id,
            in_reply_to_id: root.id,
            in_reply_to_snippet: "Root comment",
            count: { replies: 1, direct_replies: 1, likes: 0, dislikes: 0, reports: 0 },
        });
        const nestedReply = comment({
            html: "<p>Nested reply to first level</p>",
            parent_id: root.id,
            in_reply_to_id: firstReply.id,
            in_reply_to_snippet: "First level reply",
        });
        fakeCommentRead(root);
        fakeCommentRead(firstReply);
        // Thread queries filter on the thread root's id; the main list sends no filter.
        fakeComments(({ filter }) => {
            if (!filter) {
                return [root];
            }
            return filter.includes(firstReply.id) ? [nestedReply] : [firstReply];
        });
        await renderAdminApp(`/comments?thread=is:${root.id}`);

        await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
        await expect.element(commentsScreen.threadRow(firstReply.id)).toBeVisible();
        // Direct children carry no replied-to context in their parent's thread.
        await expect.element(commentsScreen.repliedToLink(commentsScreen.threadRow(firstReply.id))).not.toBeInTheDocument();

        await commentsScreen.repliesMetric(commentsScreen.threadRow(firstReply.id)).click();

        await expect.poll(currentRoute).toContain(`thread=is%3A${firstReply.id}`);
        await expect.element(commentsScreen.threadRow(firstReply.id)).toBeVisible();
        await expect.element(commentsScreen.threadRow(nestedReply.id)).toBeVisible();
        // The thread root — itself a reply — shows what it replied to.
        await expect.element(commentsScreen.repliedToLink(commentsScreen.threadRow(firstReply.id))).toBeVisible();
    });

    it("opens threads from the main comment list", async () => {
        const root = comment({ html: "<p>Comment with replies</p>", count: { replies: 1, direct_replies: 1, likes: 0, dislikes: 0, reports: 0 } });
        const reply = comment({
            html: "<p>A reply to the comment</p>",
            parent_id: root.id,
            in_reply_to_id: root.id,
            in_reply_to_snippet: "Comment with replies",
        });
        fakeCommentRead(root);
        fakeComments(({ filter }) => (filter ? [reply] : [root, reply]));
        await renderAdminApp("/comments");

        await commentsScreen.repliesMetric(commentsScreen.commentRow("Comment with replies")).click();

        await expect.poll(currentRoute).toContain(`thread=is%3A${root.id}`);
        await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
        await expect.element(commentsScreen.threadRow(reply.id)).toBeVisible();

        // Back on the list, the reply's replied-to link is the other thread entry point.
        await commentsScreen.closeThreadSidebar();
        await expect.element(commentsScreen.threadSidebar()).not.toBeInTheDocument();

        await commentsScreen.repliedToLink(commentsScreen.commentRow("A reply to the comment")).click();

        await expect.poll(currentRoute).toContain(`thread=is%3A${root.id}`);
        await expect.element(commentsScreen.threadSidebar()).toBeVisible();
    });

    it("loads more replies from the load more button", async () => {
        const root = comment({ html: "<p>Root comment for pagination test</p>", count: { replies: 5, direct_replies: 5, likes: 0, dislikes: 0, reports: 0 } });
        const replies = Array.from({ length: 5 }, (_, i) => comment({
            html: `<p>Reply number ${i + 1}</p>`,
            parent_id: root.id,
            in_reply_to_id: root.id,
        }));
        fakeCommentRead(root);
        fakeComments([root]);
        // The thread query (the only filtered browse here) pages at 3 replies per request.
        const threadApi = fakeAdminEndpoint("GET", /^\/comments\/\?.*filter=/, ({ url }) => {
            const requestedPage = Number(new URL(url).searchParams.get("page") ?? "1");
            return browseResponse("comments", replies, { page: requestedPage, limit: 3 });
        });
        await renderAdminApp(`/comments?thread=is:${root.id}`);

        await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
        await expect(commentsScreen.threadRows()).toHaveCount(4); // root + first page of 3
        await expect.element(commentsScreen.loadMoreRepliesButton()).toBeVisible();

        await commentsScreen.loadMoreRepliesButton().click();

        await expect(commentsScreen.threadRows()).toHaveCount(6); // root + all 5 replies
        await expect.element(commentsScreen.loadMoreRepliesButton()).not.toBeInTheDocument();
        await expect.poll(() => threadApi.requests.length).toBe(2);
    });
});
