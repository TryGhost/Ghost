// Ghost Post Options based on the Ghost schema
export interface PostOptions {
    id?: string;
    uuid?: string;
    title?: string;
    slug?: string;
    mobiledoc?: string | null;
    lexical?: string | null;
    html?: string | null;
    comment_id?: string | null;
    plaintext?: string | null;
    feature_image?: string | null;
    featured?: boolean;
    type?: 'post' | 'page';
    status?: 'published' | 'draft' | 'scheduled' | 'sent';
    locale?: string | null;
    visibility?: string;
    email_recipient_filter?: string;
    created_at?: Date;
    created_by?: string;
    updated_at?: Date;
    updated_by?: string;
    published_at?: Date | null;
    published_by?: string | null;
    custom_excerpt?: string | null;
    codeinjection_head?: string | null;
    codeinjection_foot?: string | null;
    custom_template?: string | null;
    canonical_url?: string | null;
    newsletter_id?: string | null;
    show_title_and_feature_image?: boolean;
}

// Return type for created posts
export type PostResult = PostOptions & {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    status: PostOptions['status'];
    type: PostOptions['type'];
    created_at: Date;
    updated_at: Date;
    mobiledoc: string | null;
    lexical: string | null;
    html: string | null;
    comment_id: string | null;
    plaintext: string | null;
    feature_image: string | null;
    locale: string | null;
    visibility: string;
    email_recipient_filter: string;
    created_by: string;
    updated_by: string;
    custom_excerpt: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    custom_template: string | null;
    canonical_url: string | null;
    newsletter_id: string | null;
    show_title_and_feature_image: boolean;
    featured: boolean;
};

// Base factory plugin interface
export interface FactoryPlugin {
    name: string;
    setup(): Promise<void>;
    destroy(): Promise<void>;
}

// Data factory interface with strong typing
export interface DataFactory {
    // Ghost methods
    createPost(options?: PostOptions): Promise<PostResult>;
    
    // Add more methods as you add more factories
    // createUser(options?: UserOptions): Promise<UserResult>;
    // createTag(options?: TagOptions): Promise<TagResult>;
    
    // Note: destroy() is handled automatically by withDataFactory
}