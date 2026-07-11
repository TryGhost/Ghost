import {comment} from "./comment";
import type {Comment} from "./comment";

/** A reply declaration: overrides for the node plus its own nested replies. */
export interface ReplySpec {
    overrides: Partial<Comment>;
    replies: ReplySpec[];
}

/** Declare one reply in a `commentThread`, optionally with nested replies of its own. */
export function reply(overrides: Partial<Comment> = {}, replies: ReplySpec[] = []): ReplySpec {
    return {overrides, replies};
}

/** Ghost derives the snippet from the replied-to comment's html text content. */
function toSnippet(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function countDescendants(specs: ReplySpec[]): number {
    return specs.reduce((total, spec) => total + 1 + countDescendants(spec.replies), 0);
}

/**
 * Build a nested comment thread the way Ghost's Admin API serves it: threads
 * are flat, so every descendant gets `parent_id = root.id` while
 * `in_reply_to_id`/`in_reply_to_snippet` point at the actual replied-to
 * comment (snippet = its html's text content); `count.replies` counts each
 * node's total descendants and `count.direct_replies` its direct children;
 * replies share the root's post. Explicit overrides win over every
 * derivation.
 *
 * Returns `{root, all}`: `all` lists every built comment depth-first with
 * the root first, so `const [root, first, nested] = thread.all` follows the
 * declaration order.
 */
export function commentThread(rootOverrides: Partial<Comment> = {}, replies: ReplySpec[] = []): {root: Comment; all: Comment[]} {
    const buildNode = (specReplies: ReplySpec[], overrides: Partial<Comment>): Comment => comment({
        count: {
            replies: countDescendants(specReplies),
            direct_replies: specReplies.length,
            likes: 0,
            dislikes: 0,
            reports: 0
        },
        ...overrides
    });

    const root = buildNode(replies, rootOverrides);
    const all: Comment[] = [root];

    const buildReplies = (specs: ReplySpec[], repliedTo: Comment): void => {
        for (const spec of specs) {
            const built = buildNode(spec.replies, {
                post_id: root.post_id,
                post: root.post,
                parent_id: root.id,
                in_reply_to_id: repliedTo.id,
                in_reply_to_snippet: toSnippet(repliedTo.html),
                ...spec.overrides
            });
            all.push(built);
            buildReplies(spec.replies, built);
        }
    };
    buildReplies(replies, root);

    return {root, all};
}
