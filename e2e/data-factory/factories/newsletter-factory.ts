import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug, generateUuid} from '@/data-factory';

export interface Newsletter {
    id: string;
    uuid: string;
    name: string;
    description: string | null;
    slug: string;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string;
    status: 'active' | 'archived';
    visibility: string;
    subscribe_on_signup: boolean;
    sort_order: number;
    header_image: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    show_excerpt: boolean;
    title_font_category: 'serif' | 'sans_serif';
    title_alignment: 'center' | 'left';
    show_feature_image: boolean;
    body_font_category: 'serif' | 'sans_serif';
    footer_content: string | null;
    show_badge: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    feedback_enabled: boolean;
    created_at: Date;
    updated_at: Date | null;
}

export class NewsletterFactory extends Factory<Partial<Newsletter>, Newsletter> {
    entityType = 'newsletters';

    build(options: Partial<Newsletter> = {}): Newsletter {
        const now = new Date();
        const name = options.name || faker.lorem.words(2);

        const defaults: Newsletter = {
            id: generateId(),
            uuid: generateUuid(),
            name: name,
            description: faker.lorem.sentence(),
            slug: options.slug || generateSlug(name) + '-' + Date.now().toString(16),
            sender_name: null,
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            sort_order: 0,
            header_image: null,
            show_header_icon: true,
            show_header_title: true,
            show_excerpt: false,
            title_font_category: 'sans_serif',
            title_alignment: 'center',
            show_feature_image: true,
            body_font_category: 'sans_serif',
            footer_content: null,
            show_badge: true,
            show_header_name: true,
            show_post_title_section: true,
            feedback_enabled: false,
            created_at: now,
            updated_at: now
        };

        return {...defaults, ...options} as Newsletter;
    }
}
