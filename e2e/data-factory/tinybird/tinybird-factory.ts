import type {PageHitOptions, PageHitResult} from '../types';
import {PageHitFactory} from './page-hit-factory';

/**
 * TinybirdFactory is a coordinator that manages all Tinybird-related subfactories.
 * It does not extend Factory as it delegates to specialized factories.
 */
export class TinybirdFactory {
    private siteUuid: string;
    private pageHitFactory: PageHitFactory;
    private tinybirdHost: string;
    private tinybirdToken: string;
    
    constructor(siteUuid: string) {
        this.siteUuid = siteUuid;
        this.pageHitFactory = new PageHitFactory(siteUuid);
        
        // Store these for clearAllPageHits functionality
        this.tinybirdHost = process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events';
        this.tinybirdToken = process.env.TINYBIRD_TOKEN || 'p.eyJ1IjogIjY0NDNmYzRhLTQxZjItNDkyOC05MTMxLTAzNzVmNzRiODlmMyIsICJpZCI6ICJmZDRlZjdmYS01NzcyLTQxNTUtYmI4Zi03OWQ5OTBkYTUzNjYiLCAiaG9zdCI6ICJsb2NhbCJ9.-Y0JOEkCfuXylkeY6uyFls_NJGpshjjhY634JALkP6M';
    }
    
    async setup(): Promise<void> {
        // Setup all subfactories
        await this.pageHitFactory.setup();
        // Future: await this.clickFactory.setup();
        // Future: await this.sessionFactory.setup();
    }
    
    async destroy(): Promise<void> {
        // Destroy all subfactories
        await this.pageHitFactory.destroy();
        // No cleanup needed for Tinybird factory itself
    }
    
    // Page hit methods - delegate to PageHitFactory
    async createPageHit(options?: PageHitOptions): Promise<PageHitResult> {
        return this.pageHitFactory.create(options);
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
     * Clear all analytics data from Tinybird (for testing purposes)
     * Note: This will TRUNCATE both the analytics_events datasource and _mv_hits materialized view
     */
    async clearAllPageHits(): Promise<void> {
        const datasources = ['analytics_events', '_mv_hits'];
        
        for (const datasource of datasources) {
            const url = `http://localhost:7181/v0/datasources/${datasource}/truncate?token=${this.tinybirdToken}`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Failed to clear ${datasource}: ${response.status} - ${text}`);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.warn(`Failed to clear ${datasource}:`, error instanceof Error ? error.message : String(error));
                if (process.env.FAIL_ON_TINYBIRD_ERROR === 'true') {
                    throw error;
                }
            }
        }
    }
    
    // Future methods will follow the same pattern:
    // async createClick(options: ClickOptions = {}): Promise<ClickResult> {
    //     return this.clickFactory.create(options);
    // }
    
    // Cross-entity methods can be added here
    // async simulateUserSession(options: SessionOptions = {}): Promise<SessionResult> {
    //     // Create page hits, clicks, etc. to simulate a full user session
    // }
}