import {Factory} from '../base-factory';
import {faker} from '@faker-js/faker';
import {v4 as uuid} from 'uuid';
import type {PageHitOptions, PageHitResult} from '../types';

export class PageHitFactory extends Factory {
    name = 'pageHit';
    private siteUuid: string;
    private tinybirdHost: string;
    private tinybirdToken: string;
    
    constructor(siteUuid: string) {
        super();
        this.siteUuid = siteUuid;
        // Default to localhost for e2e testing
        this.tinybirdHost = process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events';
        // Use provided token or fall back to the test token from .env
        this.tinybirdToken = process.env.TINYBIRD_TOKEN || 'p.eyJ1IjogIjY0NDNmYzRhLTQxZjItNDkyOC05MTMxLTAzNzVmNzRiODlmMyIsICJpZCI6ICJmZDRlZjdmYS01NzcyLTQxNTUtYmI4Zi03OWQ5OTBkYTUzNjYiLCAiaG9zdCI6ICJsb2NhbCJ9.-Y0JOEkCfuXylkeY6uyFls_NJGpshjjhY634JALkP6M';
    }
    
    async setup(): Promise<void> {
        // No setup needed for page hits - Tinybird is a separate service
    }
    
    async destroy(): Promise<void> {
        // No cleanup needed for individual factory
        // Cleanup is handled at the TinybirdFactory level
    }
    
    /**
     * Create and send a page hit event to Tinybird
     */
    async create(options?: PageHitOptions): Promise<PageHitResult> {
        const timestamp = options?.timestamp || new Date();
        const pathname = options?.pathname || '/';
        
        // Build the event
        const event: PageHitResult = {
            timestamp: timestamp.toISOString().replace('T', ' ').slice(0, -1),
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
}