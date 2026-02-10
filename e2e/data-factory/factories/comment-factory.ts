import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {generateId} from '@/data-factory';

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

export class CommentFactory extends Factory<Partial<Comment>, Comment> {
    entityType = 'comments';

    build(options: Partial<Comment> = {}): Comment {
        const content = options.html || `<p>${faker.lorem.sentence()}</p>`;

        return {
            id: generateId(),
            post_id: options.post_id || '',
            member_id: options.member_id || '',
            status: 'published',
            html: content,
            ...options
        };
    }
}
