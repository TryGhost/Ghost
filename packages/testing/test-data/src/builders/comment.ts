import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";
import {member} from "./member";
import type {Member} from "./member";

/** The trimmed post embed the comments API returns alongside each comment. */
export interface CommentPost {
    id: string;
    title: string;
    slug: string;
    url: string;
    feature_image?: string;
    excerpt?: string;
}

/**
 * Ghost Admin API comment resource — the API *response* shape: full member
 * and post embeds, server-computed counts and `in_reply_to_snippet`.
 * Overrides win field-by-field, so a caller replacing an embed (`member`,
 * `post`) must keep the matching id field (`member_id`, `post_id`) in sync
 * itself when a spec depends on it.
 */
export interface Comment {
    id: string;
    html: string;
    status: "published" | "hidden" | "deleted";
    pinned: boolean;
    created_at: string;
    updated_at: string;
    post_id: string;
    member_id: string;
    parent_id: string | null;
    in_reply_to_id: string | null;
    in_reply_to_snippet: string | null;
    member: Member;
    post: CommentPost;
    count: {
        replies: number;
        direct_replies: number;
        likes: number;
        dislikes: number;
        reports: number;
    };
}

export const comment = createBuilder<Comment>(() => {
    const now = new Date().toISOString();
    const author = member();
    const postTitle = faker.lorem.words(3);
    const postSlug = `${generateSlug(postTitle)}-${faker.string.alphanumeric(6).toLowerCase()}`;
    const post: CommentPost = {
        id: generateId(),
        title: postTitle,
        slug: postSlug,
        url: `https://example.com/${postSlug}/`
    };

    return {
        id: generateId(),
        html: `<p>${faker.lorem.sentence()}</p>`,
        status: "published",
        pinned: false,
        created_at: now,
        updated_at: now,
        post_id: post.id,
        member_id: author.id,
        parent_id: null,
        in_reply_to_id: null,
        in_reply_to_snippet: null,
        member: author,
        post,
        count: {
            replies: 0,
            direct_replies: 0,
            likes: 0,
            dislikes: 0,
            reports: 0
        }
    };
});
