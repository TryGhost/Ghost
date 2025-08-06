import {Factory} from './factory';
import {faker} from '@faker-js/faker';
import {generateDateBasedId, generateSlug} from '../utils/fixtures';
import {PostOptions, PostResult} from './types';

export class PostFactory extends Factory<PostOptions, PostResult> {
    entityType = 'posts';

    build(options: PostOptions = {}): PostResult {
        const post: PostResult = {
            ...this.defaults,
            ...options
        } as PostResult;

        if (post.status === 'published' && post.published_at === null) {
            post.published_at = new Date();
        }

        return post;
    }

    private get defaults() {
        const title = faker.lorem.sentences();
        const content = faker.lorem.paragraphs(3);
        const currentDate = new Date();

        return {
            id: generateDateBasedId(),
            uuid: faker.datatype.uuid(),
            title: title,
            slug: generateSlug('test'),
            mobiledoc: JSON.stringify(this.modileDoc(content)),
            lexical: null,
            html: `<p>${content}</p>`,
            comment_id: generateDateBasedId(),
            plaintext: content,
            feature_image: `https://picsum.photos/800/600?random=${Math.random()}`,
            featured: faker.datatype.boolean(),
            type: 'post',
            status: 'draft',
            locale: null,
            visibility: 'public',
            email_recipient_filter: 'none',
            created_at: currentDate,
            updated_at: currentDate,
            published_at: null,
            custom_excerpt: faker.lorem.paragraph(),
            codeinjection_head: null,
            codeinjection_foot: null,
            custom_template: null,
            canonical_url: null,
            newsletter_id: null,
            show_title_and_feature_image: true
        };
    }

    private modileDoc(content: string) {
        return {
            version: '0.3.1',
            atoms: [],
            cards: [],
            markups: [],
            sections: [[1, 'p', [[0, [], 0, content]]]],
            ghostVersion: '5.0'
        };
    }
}
