import {Factory} from '../../../base-factory';
import {faker} from '@faker-js/faker';
import {generateUuid} from '../../../utils';
import type {PageHitOptions, PageHitResult} from './types';

export class PageHitFactory extends Factory<PageHitOptions, PageHitResult> {
    name = 'pageHit';
    entityType = 'analytics_events'; // Maps to Tinybird datasource
    private createdSessionIds = new Set<string>();
    private eventCount = 0;
    
    constructor(
        private siteUuid: string
    ) {
        super();
    }
    
    async destroy(): Promise<void> {
        // Clear tracked sessions
        this.createdSessionIds.clear();
        this.eventCount = 0;
    }
    
    /**
     * Build a page hit event without sending it
     */
    build(options?: PageHitOptions): PageHitResult {
        const timestamp = options?.timestamp || new Date();
        const pathname = options?.pathname || '/';
        
        // Generate new session_id if not provided
        const sessionId = options?.session_id || generateUuid();
        
        // Build the event
        const event: PageHitResult = {
            timestamp: timestamp.toISOString().replace('T', ' ').slice(0, -1),
            action: 'page_hit',
            version: '1',
            session_id: sessionId,
            payload: {
                site_uuid: this.siteUuid,
                member_uuid: options?.member_uuid || 'undefined',
                member_status: options?.member_status || 'undefined',
                post_uuid: options?.post_uuid || 'undefined',
                pathname: pathname,
                referrer: options?.referrer || '',
                'user-agent': options?.user_agent || faker.internet.userAgent(),
                locale: options?.locale || 'en-US',
                location: options?.location || 'US',
                href: `https://example.com${pathname}`,
                meta: {}
            }
        };
        
        // Add referrer source if we have a referrer
        if (options?.referrer) {
            event.payload.meta.referrerSource = this.getReferrerSource(options.referrer);
        }
        
        return event;
    }
    
    /**
     * Override extractId to use session_id as the identifier
     */
    protected extractId(entity: PageHitResult): string | undefined {
        return entity.session_id;
    }
    
    /**
     * Build and send a page hit event to Tinybird
     * Override to track sessions for custom cleanup
     */
    async create(options?: PageHitOptions): Promise<PageHitResult> {
        // Use base class create which will call our build() and use persistence
        const event = await super.create(options);
        
        // Track the session for our custom session-based cleanup
        this.createdSessionIds.add(event.session_id);
        this.eventCount += 1;
        
        return event;
    }
    
    /**
     * Parse referrer source from URL
     */
    private getReferrerSource(referrer: string): string {
        const sourceMap: Record<string, string> = {
            'news.google.com': 'Google News',
            'google.com': 'Google',
            'duckduckgo.com': 'DuckDuckGo',
            'bing.com': 'Bing',
            'reddit.com': 'Reddit',
            'go.bsky.app': 'Bluesky',
            't.co': 'Twitter',
            'facebook.com': 'Facebook'
        };
        
        // Check domains in order (more specific first)
        for (const [domain, source] of Object.entries(sourceMap)) {
            if (referrer.includes(domain)) {
                return source;
            }
        }
        
        return new URL(referrer).hostname;
    }
    
    /**
     * Create multiple hits for the same session
     */
    async createSessionHits(sessionId: string, count: number, options?: Omit<PageHitOptions, 'session_id'>): Promise<PageHitResult[]> {
        const hits: PageHitResult[] = [];
        for (let i = 0; i < count; i++) {
            const hit = await this.create({
                ...options,
                session_id: sessionId
            });
            hits.push(hit);
        }
        return hits;
    }
    
    /**
     * Create a new session and return its ID for reuse
     */
    createNewSession(): string {
        const sessionId = generateUuid();
        this.createdSessionIds.add(sessionId);
        return sessionId;
    }
    
    /**
     * Get statistics about created data
     */
    getStats(): { sessions: number; events: number } {
        return {
            sessions: this.createdSessionIds.size,
            events: this.eventCount
        };
    }
}