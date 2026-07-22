import {Factory} from '@/data-factory';
import {comment} from '@tryghost/test-data';
import type {Comment as CanonicalComment} from '@tryghost/test-data';

/**
 * The *write/create* shape POSTed to /ghost/api/admin/comments/. The
 * canonical *response* shape (member/post embeds, counts, reply metadata)
 * lives in `@tryghost/test-data`; `build()` derives this payload from it.
 */
export interface Comment {
    id: string;
    post_id: string;
    member_id: string;
    parent_id?: string;
    in_reply_to_id?: string;
    status: 'published' | 'hidden' | 'deleted';
    html: string;
    created_at?: string;
    edited_at?: string;
}

/**
 * Derive the create payload from the canonical API response shape: embeds,
 * counts and reply metadata are response-only, and the embeds' random ids
 * are dropped — specs must reference persisted posts/members themselves.
 */
function toCreatePayload(canonical: CanonicalComment): Comment {
    return {
        id: canonical.id,
        post_id: '',
        member_id: '',
        status: canonical.status,
        html: canonical.html
    };
}

export class CommentFactory extends Factory<Partial<Comment>, Comment> {
    entityType = 'comments';

    build(options: Partial<Comment> = {}): Comment {
        return {
            ...toCreatePayload(comment()),
            ...options
        };
    }
}
