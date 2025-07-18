const BaseBuilder = require('./base-builder');
const {faker} = require('@faker-js/faker');

/**
 * PostBuilder provides a fluent interface for creating posts with precise control
 */
class PostBuilder extends BaseBuilder {
    constructor(factory) {
        super(factory, 'posts');
    }

    /**
     * Set post title
     */
    withTitle(title) {
        return this.set('title', title);
    }

    /**
     * Set post slug
     */
    withSlug(slug) {
        return this.set('slug', slug);
    }

    /**
     * Set post status (draft, published, scheduled, sent)
     */
    withStatus(status) {
        if (!['draft', 'published', 'scheduled', 'sent'].includes(status)) {
            throw new Error(`Invalid post status: ${status}. Must be 'draft', 'published', 'scheduled', or 'sent'`);
        }
        return this.set('status', status);
    }

    /**
     * Set published date
     */
    withPublishedAt(date) {
        return this.set('published_at', this.factory.dateToDatabase(date));
    }

    /**
     * Set created date
     */
    withCreatedAt(date) {
        return this.set('created_at', this.factory.dateToDatabase(date));
    }

    /**
     * Set post content (mobiledoc format)
     */
    withContent(content) {
        const mobiledoc = {
            version: '0.3.1',
            atoms: [],
            cards: [],
            markups: [],
            sections: [[1, 'p', [[0, [], 0, content]]]],
            ghostVersion: '4.0'
        };
        return this
            .set('mobiledoc', JSON.stringify(mobiledoc))
            .set('html', `<p>${content}</p>`)
            .set('plaintext', content);
    }

    /**
     * Set post excerpt
     */
    withExcerpt(excerpt) {
        return this.set('custom_excerpt', excerpt);
    }

    /**
     * Set post visibility
     */
    withVisibility(visibility) {
        if (!['public', 'members', 'paid', 'tiers'].includes(visibility)) {
            throw new Error(`Invalid visibility: ${visibility}`);
        }
        return this.set('visibility', visibility);
    }

    /**
     * Set featured status
     */
    asFeatured() {
        return this.set('featured', true);
    }

    /**
     * Set post type
     */
    withType(type) {
        return this.set('type', type);
    }

    /**
     * Create a published post
     */
    asPublished(publishedAt = new Date()) {
        return this
            .withStatus('published')
            .withPublishedAt(publishedAt)
            .set('published_by', '1');
    }

    /**
     * Create a draft post
     */
    asDraft() {
        return this.withStatus('draft');
    }

    /**
     * Create a scheduled post
     */
    asScheduled(scheduledFor) {
        return this
            .withStatus('scheduled')
            .withPublishedAt(scheduledFor);
    }

    /**
     * Create a sent post (newsletter)
     */
    asSent(sentAt = new Date()) {
        return this
            .withStatus('sent')
            .withPublishedAt(sentAt);
    }

    /**
     * Add author to post
     */
    withAuthor(authorId) {
        return this.afterCreate(async (post) => {
            await this.factory.insert('posts_authors', {
                post_id: post.id,
                author_id: authorId,
                sort_order: 0
            });
        });
    }

    /**
     * Add tags to post
     */
    withTags(tagNames) {
        return this.afterCreate(async (post) => {
            let sortOrder = 0;
            for (const tagName of tagNames) {
                // Find or create tag
                let tag = await this.factory.knex('tags')
                    .where('name', tagName)
                    .first();
                    
                if (!tag) {
                    tag = await this.factory.insert('tags', {
                        name: tagName,
                        slug: this.factory.generateSlug(tagName),
                        created_by: '1'
                    });
                }
                
                // Create post-tag relationship
                await this.factory.insert('posts_tags', {
                    post_id: post.id,
                    tag_id: tag.id,
                    sort_order: sortOrder++
                });
            }
        });
    }

    /**
     * Send post as newsletter
     */
    withNewsletter(newsletterId = null) {
        return this.afterCreate(async (post) => {
            // Find newsletter if not provided
            if (!newsletterId) {
                const newsletter = await this.factory.knex('newsletters')
                    .where('status', 'active')
                    .first();
                newsletterId = newsletter ? newsletter.id : null;
            }

            if (!newsletterId) {
                throw new Error('No active newsletter found');
            }

            // Set newsletter_id on the post object
            post.newsletter_id = newsletterId;

            // Create email record if post is sent
            if (post.status === 'sent' || (post.status === 'published' && post.email_recipient_filter)) {
                await this.factory.insert('emails', {
                    post_id: post.id,
                    uuid: faker.datatype.uuid(),
                    status: 'sent',
                    recipient_filter: post.email_recipient_filter || 'all',
                    subject: post.title,
                    from: null,
                    reply_to: null,
                    html: `<p>${post.title}</p>`,
                    plaintext: post.title,
                    source: '{}',
                    source_type: 'mobiledoc',
                    track_opens: true,
                    track_clicks: true,
                    feedback_enabled: false,
                    submitted_at: this.factory.dateToDatabase(new Date()),
                    newsletter_id: newsletterId,
                    created_by: '1',
                    email_count: 0,
                    delivered_count: 0,
                    opened_count: 0,
                    failed_count: 0
                });
            }
        });
    }

    /**
     * Create a published post that was also sent as newsletter
     */
    asPublishedAndSent(publishedAt = new Date()) {
        return this
            .withStatus('published')
            .withPublishedAt(publishedAt)
            .set('email_recipient_filter', 'all')
            .withNewsletter();
    }

    /**
     * Generate default values specific to posts
     */
    generateDefaults() {
        const defaults = super.generateDefaults();
        
        // Post-specific defaults
        if (!this.data.uuid) {
            defaults.uuid = faker.datatype.uuid();
        }
        
        if (!this.data.title) {
            defaults.title = faker.lorem.sentence();
        }
        
        if (!this.data.slug && this.data.title) {
            defaults.slug = this.factory.generateSlug(this.data.title || defaults.title);
        }
        
        if (!this.data.status) {
            defaults.status = 'draft';
        }
        
        if (!this.data.visibility) {
            defaults.visibility = 'public';
        }
        
        if (!this.data.mobiledoc) {
            const content = faker.lorem.paragraphs(3);
            defaults.mobiledoc = JSON.stringify({
                version: '0.3.1',
                atoms: [],
                cards: [],
                markups: [],
                sections: [[1, 'p', [[0, [], 0, content]]]],
                ghostVersion: '4.0'
            });
        }
        
        if (!this.data.type) {
            defaults.type = 'post';
        }
        
        if (!this.data.featured) {
            defaults.featured = false;
        }
        
        // Set created_by to system user
        if (!this.data.created_by) {
            defaults.created_by = '1';
        }
        
        // Set updated_by
        if (!this.data.updated_by) {
            defaults.updated_by = '1';
        }
        
        // Set email_recipient_filter default
        if (!this.data.email_recipient_filter) {
            defaults.email_recipient_filter = 'none';
        }
        
        // Generate HTML and plaintext from mobiledoc
        if ((this.data.mobiledoc || defaults.mobiledoc) && !this.data.html) {
            try {
                const mobiledoc = JSON.parse(this.data.mobiledoc || defaults.mobiledoc);
                // Extract text content from mobiledoc
                let plaintext = '';
                let html = '';
                
                mobiledoc.sections.forEach((section) => {
                    if (section[0] === 1 && section[1] === 'p') {
                        const text = section[2][0][2];
                        plaintext += text + '\n\n';
                        html += `<p>${text}</p>`;
                    }
                });
                
                defaults.html = html.trim();
                defaults.plaintext = plaintext.trim();
            } catch (e) {
                // If mobiledoc parsing fails, set defaults
                defaults.html = '<p>Content</p>';
                defaults.plaintext = 'Content';
            }
        }
        
        // Set published_by for published posts
        if (this.data.status === 'published' && !this.data.published_by) {
            defaults.published_by = '1';
        }
        
        return defaults;
    }
    
    /**
     * Override create to ensure posts always have an author
     */
    async create() {
        // Check if we have any author set
        const hasAuthor = this.postCreateHooks.some(hook => hook.toString().includes('posts_authors'));
        
        // If no author was specified, add the default user as author
        if (!hasAuthor) {
            this.withAuthor('1');
        }
        
        // Call parent create method
        return super.create();
    }
}

module.exports = PostBuilder;