import {Factory} from '../../../base-factory';
import {faker} from '@faker-js/faker';
import {v4 as uuid} from 'uuid';
import type {PageHitOptions, PageHitResult} from './types';
import type {TinybirdConfig, HttpClient} from '../interfaces';
import {FetchHttpClient} from '../interfaces';

export class PageHitFactory extends Factory {
    name = 'pageHit';
    private httpClient: HttpClient;
    private createdSessionIds = new Set<string>();
    private createdEventIds = new Set<string>();
    
    constructor(
        private siteUuid: string,
        private config: TinybirdConfig,
        httpClient?: HttpClient
    ) {
        super();
        this.httpClient = httpClient ?? new FetchHttpClient();
    }
    
    async setup(): Promise<void> {
        // No setup needed for page hits - Tinybird is a separate service
    }
    
    async destroy(): Promise<void> {
        // Clean up all tracked sessions
        if (this.createdSessionIds.size > 0) {
            await this.deleteBySessionIds(Array.from(this.createdSessionIds));
            this.createdSessionIds.clear();
            this.createdEventIds.clear();
        }
    }
    
    /**
     * Create and send a page hit event to Tinybird
     */
    async create(options?: PageHitOptions): Promise<PageHitResult> {
        const timestamp = options?.timestamp || new Date();
        const pathname = options?.pathname || '/';
        
        // Generate new session_id if not provided
        const sessionId = options?.session_id || uuid();
        
        // Track the session
        this.createdSessionIds.add(sessionId);
        
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
                event_id: uuid(),
                meta: {}
            }
        };
        
        // Add referrer source if we have a referrer
        if (options?.referrer) {
            event.payload.meta.referrerSource = this.getReferrerSource(options.referrer);
        }
        
        // Track event ID
        this.createdEventIds.add(event.payload.event_id);
        
        // Send to Tinybird
        await this.sendToTinybird(event);
        
        return event;
    }
    
    /**
     * Send event to Tinybird via HTTP POST
     */
    private async sendToTinybird(event: PageHitResult): Promise<void> {
        // Default to analytics_events data source
        const datasource = 'analytics_events';
        const url = `${this.config.host}?name=${datasource}&token=${this.config.token}`;
        
        try {
            const response = await this.httpClient.fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-site-uuid': this.siteUuid
                },
                body: JSON.stringify(event)
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Tinybird request failed: ${response.status} - ${text}`);
            }
        } catch (error) {
            // Log the error for debugging
            // eslint-disable-next-line no-console
            console.warn('Tinybird error:', error instanceof Error ? error.message : String(error));
            // eslint-disable-next-line no-console
            console.warn('URL:', url);
            
            // For e2e tests, we might want to continue even if Tinybird is not available
            if (process.env.FAIL_ON_TINYBIRD_ERROR === 'true') {
                throw error;
            }
            // Continue if Tinybird is not available in test environment
        }
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
        const sessionId = uuid();
        this.createdSessionIds.add(sessionId);
        return sessionId;
    }
    
    /**
     * Get statistics about created data
     */
    getStats(): { sessions: number; events: number } {
        return {
            sessions: this.createdSessionIds.size,
            events: this.createdEventIds.size
        };
    }
    
    private async deleteBySessionIds(sessionIds: string[]): Promise<void> {
        // Delete in batches if there are many sessions
        const batchSize = 100;
        for (let i = 0; i < sessionIds.length; i += batchSize) {
            const batch = sessionIds.slice(i, i + batchSize);
            await this.deleteBatch(batch);
        }
    }
    
    private async deleteBatch(sessionIds: string[]): Promise<void> {
        const url = `${this.config.host}/v0/datasources/analytics_events/delete`;
        
        // Create SQL IN clause for multiple session IDs
        const sessionIdList = sessionIds.map(id => `'${id}'`).join(',');
        
        try {
            const response = await this.httpClient.fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    condition: `session_id IN (${sessionIdList})`
                })
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to delete events: ${response.status} - ${text}`);
            }
        } catch (error) {
            if (process.env.FAIL_ON_TINYBIRD_ERROR === 'true') {
                throw error;
            }
            // Log but continue if cleanup fails
            // eslint-disable-next-line no-console
            console.warn('Failed to clean up Tinybird events:', error);
        }
    }
}