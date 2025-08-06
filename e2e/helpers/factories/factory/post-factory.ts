import {Factory} from './factory';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug} from '../utils/fixtures';
import {PostOptions, PostResult} from './types';

export class PostFactory extends Factory<PostOptions, PostResult> {
    entityType = 'posts';

    build(options: PostOptions = {}): PostResult {
        const now = new Date();
        const title = options.title || faker.lorem.sentences();
        const content = faker.lorem.paragraphs(3);

        const mobileDoc = {
            version: '0.3.1',
            atoms: [],
            cards: [],
            markups: [],
            sections: [[1, 'p', [[0, [], 0, content]]]],
            ghostVersion: '5.0'
        };

        const defaults = {
            id: generateId(),
            uuid: faker.datatype.uuid(),
            title: title,
            slug: options.slug || generateSlug(title) + '-' + Date.now().toString(16),
            mobiledoc: JSON.stringify(mobileDoc),
            lexical: null,
            html: `<p>${content}</p>`,
            comment_id: generateId(),
            plaintext: content,
            feature_image: `https://picsum.photos/800/600?random=${Math.random()}`,
            featured: faker.datatype.boolean(),
            type: 'post',
            status: 'draft',
            locale: null,
            visibility: 'public',
            email_recipient_filter: 'none',
            created_at: now,
            updated_at: now,
            published_at: null,
            custom_excerpt: faker.lorem.paragraph(),
            codeinjection_head: null,
            codeinjection_foot: null,
            custom_template: null,
            canonical_url: null,
            newsletter_id: null,
            show_title_and_feature_image: true
        };

        const post: PostResult = {
            ...defaults,
            ...options,
            // Handle published_at logic - if status is published but no published_at is set, use current time
            published_at: options.status === 'published' && !options.published_at ? now : (options.published_at || defaults.published_at)
        } as PostResult;

        return post;
    }
}
