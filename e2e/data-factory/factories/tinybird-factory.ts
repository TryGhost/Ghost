import {faker} from '@faker-js/faker';
import {v4 as uuid} from 'uuid';

export interface PageHitOptions {
    timestamp?: Date;
    post_uuid?: string;
    member_uuid?: string;
    member_status?: 'free' | 'paid' | 'comped' | 'undefined';
    pathname?: string;
    referrer?: string;
    user_agent?: string;
    locale?: string;
    location?: string;
}

export interface PageHitResult {
    timestamp: string;
    action: 'page_hit';
    version: '1';
    session_id: string;
    payload: {
        site_uuid: string;
        member_uuid: string;
        member_status: string;
        post_uuid: string;
        pathname: string;
        referrer: string;
        'user-agent': string;
        locale: string;
        location: string;
        href: string;
        event_id: string;
        meta: {
            referrerSource?: string;
        };
    };
}

/**
 * Factory for creating Tinybird analytics events.
 * Sends page hit events directly to Tinybird local for e2e testing.
 */
export class TinybirdFactory {
    private siteUuid: string;
    private tinybirdHost: string;
    private tinybirdToken: string;
    
    constructor(siteUuid: string) {
        this.siteUuid = siteUuid;
        // Default to localhost for e2e testing
        this.tinybirdHost = process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events';
        // Use provided token or fall back to a test token
        this.tinybirdToken = process.env.TINYBIRD_TOKEN || 'p.eyJ1IjogIjkyZjliMTE1LTQ2MzktNDczZC1hMGVjLWVjYjVhNDY4ZjdmZSIsICJpZCI6ICJmODkyN2ZhYy0yODgyLTRmMTMtOGNjMi1jZDYxOTE5MzBkNzEiLCAiaG9zdCI6ICJsb2NhbCJ9.P4BM6n8VxxrWZc7IeuY9FIh1ftzoC0tP5LJdLT_ppyk';
    }
    
    async setup(): Promise<void> {
        // No setup needed for Tinybird - it's a separate service
    }
    
    /**
     * Create and send a page hit event to Tinybird
     */
    async createPageHit(options?: PageHitOptions): Promise<PageHitResult> {
        const timestamp = options?.timestamp || new Date();
        const pathname = options?.pathname || '/';
        
        // Build the event
        const event: PageHitResult = {
            timestamp: timestamp.toISOString().replace('T', ' ').replace('Z', ''),
            action: 'page_hit',
            version: '1',
            session_id: uuid(),
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
        
        // Send to Tinybird
        await this.sendToTinybird(event);
        
        return event;
    }
    
    /**
     * Create multiple page hits at once
     */
    async createPageHits(count: number, options?: PageHitOptions): Promise<PageHitResult[]> {
        const results: PageHitResult[] = [];
        
        for (let i = 0; i < count; i++) {
            const hit = await this.createPageHit(options);
            results.push(hit);
        }
        
        return results;
    }
    
    /**
     * Send event to Tinybird via HTTP POST
     */
    private async sendToTinybird(event: PageHitResult): Promise<void> {
        // Default to analytics_events data source
        const datasource = 'analytics_events';
        const url = `${this.tinybirdHost}?name=${datasource}&token=${this.tinybirdToken}`;
        
        try {
            const response = await fetch(url, {
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
            // For e2e tests, we might want to continue even if Tinybird is not available
            if (process.env.FAIL_ON_TINYBIRD_ERROR === 'true') {
                throw error;
            }
            // Silently continue if Tinybird is not available in test environment
        }
    }
    
    /**
     * Parse referrer source from URL
     */
    private getReferrerSource(referrer: string): string {
        const sourceMap: Record<string, string> = {
            'google.com': 'Google',
            'news.google.com': 'Google News',
            'duckduckgo.com': 'DuckDuckGo',
            'bing.com': 'Bing',
            'reddit.com': 'Reddit',
            'go.bsky.app': 'Bluesky',
            't.co': 'Twitter',
            'facebook.com': 'Facebook'
        };
        
        for (const [domain, source] of Object.entries(sourceMap)) {
            if (referrer.includes(domain)) {
                return source;
            }
        }
        
        return new URL(referrer).hostname;
    }
    
    async destroy(): Promise<void> {
        // No cleanup needed for Tinybird factory
    }
}