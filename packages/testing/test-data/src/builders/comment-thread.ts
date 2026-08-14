import {comment} from "./comment";
import type {Comment} from "./comment";

/** A reply declaration: overrides for the node plus its own nested replies. */
export interface ReplySpec {
    overrides: Partial<Comment>;
    replies: ReplySpec[];
}

/** A reply may be declared as a spec or as a string — just its paragraph text. */
export type ReplyInput = ReplySpec | string;

/** Replies may be declared as a list of specs/strings, or a count of default replies ("Reply 1..n"). */
export type RepliesInput = ReplyInput[] | number;

/** The built thread: the `[root, ...descendants]` array (depth-first) with named access. */
export type CommentThread = Comment[] & {root: Comment; all: Comment[]};

function toOverrides(input: Partial<Comment> | string): Partial<Comment> {
    return typeof input === "string" ? {html: `<p>${input}</p>`} : input;
}

function toReplySpecs(input: RepliesInput): ReplySpec[] {
    if (typeof input === "number") {
        return Array.from({length: input}, (_, index) => reply(`Reply ${index + 1}`));
    }
    return input.map(item => (typeof item === "string" ? reply(item) : item));
}

/** Declare one reply in a `commentThread`: `reply("text")`, or overrides, with nested replies. */
export function reply(overrides: Partial<Comment> | string = {}, replies: RepliesInput = []): ReplySpec {
    return {overrides: toOverrides(overrides), replies: toReplySpecs(replies)};
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
 * Wherever text is all that matters, pass strings: the root and each reply
 * accept a string as their paragraph text, and the replies argument accepts
 * a number meaning that many default replies ("Reply 1..n").
 *
 * Returns the built comments as an array — depth-first in declaration order,
 * root first, so `const [root, first, nested] = commentThread(...)` — with
 * `.root` and `.all` named access.
 */
export function commentThread(rootInput: Partial<Comment> | string = {}, replies: RepliesInput = []): CommentThread {
    const replySpecs = toReplySpecs(replies);

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

    const root = buildNode(replySpecs, toOverrides(rootInput));
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
    buildReplies(replySpecs, root);

    return Object.assign(all, {root, all});
}
