import {BasePlugin} from '../base-plugin';
import {PageHitFactory} from './page-hits/page-hit-factory';
import {getTinybirdConfig} from './config';
import type {TinybirdConfig} from './interfaces';
import type {PageHitOptions, PageHitResult} from './page-hits/types';
import {PersistenceAdapter, TinybirdPersistenceAdapter} from '../../persistence';
import {DefaultEntityRegistry} from '../../persistence/entity-registry';

export interface TinybirdPluginOptions {
    config?: TinybirdConfig;
    persistence?: PersistenceAdapter;
}

/**
 * Tinybird plugin that coordinates all analytics-related factories
 */
export class TinybirdPlugin extends BasePlugin {
    readonly name = 'tinybird';

    private config: TinybirdConfig;
    private pageHitFactory?: PageHitFactory;

    constructor(options: TinybirdPluginOptions = {}) {
        super();
        this.config = options.config ?? getTinybirdConfig();

        // Set persistence adapter if provided
        if (options.persistence) {
            this.setPersistenceAdapter(options.persistence);
        }
    }

    async setup(): Promise<void> {
        // Tinybird factories are initialized on demand via initializeWithSiteUuid()
    }

    async destroy(): Promise<void> {
        // Use base class destroy which handles all factories
        await super.destroy();
    }

    /**
     * Creates the default persistence adapter for Tinybird
     */
    private createDefaultPersistence(): PersistenceAdapter {
        const registry = new DefaultEntityRegistry();
        registry.register('analytics_events', {
            endpoint: '?name=analytics_events',
            primaryKey: 'session_id'
        });
        return new TinybirdPersistenceAdapter(this.config, registry);
    }

    /**
     * Must be called before using any Tinybird functionality
     */
    async initializeWithSiteUuid(siteUuid: string): Promise<void> {
        // Create persistence adapter if not provided
        if (!this.persistence) {
            this.setPersistenceAdapter(this.createDefaultPersistence());
        }

        // Create and register the factory
        this.pageHitFactory = this.registerFactory(new PageHitFactory(siteUuid));
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
