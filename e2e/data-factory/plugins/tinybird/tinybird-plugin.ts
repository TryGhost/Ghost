import {BasePlugin} from '../base-plugin';
import {PageHitFactory} from './page-hits/page-hit-factory';
import {getTinybirdConfig} from './config';
import type {TinybirdConfig, HttpClient} from './interfaces';
import {FetchHttpClient} from './interfaces';
import type {PageHitOptions, PageHitResult} from './page-hits/types';

export interface TinybirdPluginOptions {
    httpClient?: HttpClient;
    config?: TinybirdConfig;
}

/**
 * Tinybird plugin that coordinates all analytics-related factories
 * and shares the HTTP client between them
 */
export class TinybirdPlugin extends BasePlugin {
    readonly name = 'tinybird';
    
    private httpClient: HttpClient;
    private config: TinybirdConfig;
    private pageHitFactory?: PageHitFactory;
    
    constructor(options: TinybirdPluginOptions = {}) {
        super();
        // All Tinybird factories share these dependencies
        this.httpClient = options.httpClient ?? new FetchHttpClient();
        this.config = options.config ?? getTinybirdConfig();
    }
    
    async setup(): Promise<void> {
        // Tinybird factories are initialized on demand via initializeWithSiteUuid()
    }
    
    async destroy(): Promise<void> {
        if (this.pageHitFactory) {
            await this.pageHitFactory.destroy();
        }
    }
    
    /**
     * Must be called before using any Tinybird functionality
     */
    async initializeWithSiteUuid(siteUuid: string): Promise<void> {
        this.pageHitFactory = new PageHitFactory(siteUuid, this.config, this.httpClient);
        await this.pageHitFactory.setup();
    }
    
    isInitialized(): boolean {
        return !!this.pageHitFactory;
    }
    
    get pageHits(): PageHitFactory {
        if (!this.pageHitFactory) {
            throw new Error('Tinybird not initialized. Call initializeWithSiteUuid() first or ensure Ghost has a site_uuid.');
        }
        return this.pageHitFactory;
    }
    
    async createPageHit(options?: PageHitOptions): Promise<PageHitResult> {
        return this.pageHits.create(options);
    }
    
    async createPageHits(count: number, options?: PageHitOptions): Promise<PageHitResult[]> {
        const hits: PageHitResult[] = [];
        for (let i = 0; i < count; i++) {
            hits.push(await this.createPageHit(options));
        }
        return hits;
    }
    
    async createPageHitsForPost(postUuid: string, count: number, options?: PageHitOptions): Promise<PageHitResult[]> {
        return this.createPageHits(count, {
            post_uuid: postUuid,
            ...options
        });
    }
    
    // *
    // Convenience methods
    // *
    createNewSession(): string {
        return this.pageHits.createNewSession();
    }
    
    async createSessionHits(
        sessionId: string, 
        count: number, 
        options?: Omit<PageHitOptions, 'session_id'>
    ): Promise<PageHitResult[]> {
        return this.pageHits.createSessionHits(sessionId, count, options);
    }
    
    getStats(): {sessions: number; events: number} {
        if (!this.pageHitFactory) {
            return {sessions: 0, events: 0};
        }
        
        return this.pageHitFactory.getStats();
    }
}