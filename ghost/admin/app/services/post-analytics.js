import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostAnalyticsService extends Service {
    @service ajax;
    @service ghostPaths;
    @service feature;

    /**
     * @type {?Object} Post visitor counts by UUID
     */
    @tracked
        visitorCounts = null;

    /**
     * Load visitor counts for the given post UUIDs
     * @param {string[]} postUuids - Array of post UUIDs
     * @returns {Promise}
     */
    loadVisitorCounts(postUuids) {
        if (!postUuids || postUuids.length === 0) {
            return Promise.resolve();
        }
        
        // Check if traffic analytics is enabled
        if (!this.feature.trafficAnalytics) {
            return Promise.resolve();
        }
        
        return this._loadVisitorCounts.perform(postUuids);
    }

    /**
     * Get visitor count for a specific post UUID
     * @param {string} postUuid - Post UUID
     * @returns {number|null} Visitor count or null if not available
     */
    getVisitorCount(postUuid) {
        return this.visitorCounts && this.visitorCounts[postUuid] ? this.visitorCounts[postUuid] : null;
    }

    @task
    *_loadVisitorCounts(postUuids) {
        try {
            const statsUrl = this.ghostPaths.url.api('stats/posts-visitor-counts');
            const result = yield this.ajax.request(statsUrl, {
                method: 'GET',
                data: {
                    postUuids: postUuids.join(',')
                }
            });
            // Parse the nested response structure
            const statsData = result.stats?.[0]?.data?.visitor_counts || {};
            this.visitorCounts = statsData;
        } catch (error) {
            // Silent failure - visitor counts are not critical
            this.visitorCounts = {};
        }
    }
} 