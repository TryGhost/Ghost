import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class PostAnalyticsService extends Service {
    @service ajax;
    @service ghostPaths;
    @service feature;
    @service settings;

    /**
     * @type {?Object} Post visitor counts by UUID
     */
    @tracked
        visitorCounts = {};

    /**
     * @type {?Object} Post member conversion counts by UUID
     */
    @tracked
        memberCounts = {};

    /**
     * @type {Set} UUIDs of posts we've already fetched analytics for
     */
    _fetchedUuids = new Set();

    /**
     * @type {Set} Post IDs we've already fetched member conversions for
     */
    _fetchedMemberIds = new Set();

    /**
     * Load visitor counts for the given post UUIDs
     * @param {string[]} postUuids - Array of post UUIDs
     * @returns {Promise}
     */
    loadVisitorCounts(postUuids) {
        if (!postUuids || postUuids.length === 0) {
            return Promise.resolve();
        }
        
        // Check if web analytics is enabled
        if (!this.settings.webAnalyticsEnabled) {
            return Promise.resolve();
        }
        
        // Filter out UUIDs we've already fetched
        const newUuids = postUuids.filter(uuid => !this._fetchedUuids.has(uuid));
        
        if (newUuids.length === 0) {
            return Promise.resolve();
        }
        
        // Mark these UUIDs as being fetched
        newUuids.forEach(uuid => this._fetchedUuids.add(uuid));
        
        return this._loadVisitorCounts.perform(newUuids);
    }

    /**
     * Get visitor count for a specific post UUID
     * @param {string} postUuid - Post UUID
     * @returns {number|null} Visitor count or null if not available
     */
    getVisitorCount(postUuid) {
        return this.visitorCounts && this.visitorCounts[postUuid] ? this.visitorCounts[postUuid] : null;
    }

    /**
     * Load member conversion counts for the given posts
     * @param {Object[]} posts - Array of post objects with id and uuid
     * @returns {Promise}
     */
    loadMemberCounts(posts) {
        if (!posts || posts.length === 0) {
            return Promise.resolve();
        }
        
        // Check if member tracking is enabled
        if (!this.settings.membersTrackSources) {
            return Promise.resolve();
        }
        
        // Filter out posts we've already fetched
        const newPosts = posts.filter(post => !this._fetchedMemberIds.has(post.id));
        
        if (newPosts.length === 0) {
            return Promise.resolve();
        }
        
        // Mark these post IDs as being fetched
        newPosts.forEach(post => this._fetchedMemberIds.add(post.id));
        
        return this._loadMemberCounts.perform(newPosts);
    }

    /**
     * Get member conversion counts for a specific post
     * @param {string} postUuid - Post UUID
     * @returns {Object|null} Member counts object {free: number, paid: number} or null if not available
     */
    getMemberCounts(postUuid) {
        return this.memberCounts && this.memberCounts[postUuid] ? this.memberCounts[postUuid] : null;
    }

    /**
     * Reset the analytics cache - call this when filters change or on route transitions
     */
    reset() {
        this.visitorCounts = {};
        this.memberCounts = {};
        this._fetchedUuids.clear();
        this._fetchedMemberIds.clear();
    }

    @task
    *_loadVisitorCounts(postUuids) {
        try {
            const statsUrl = this.ghostPaths.url.api('stats/posts-visitor-counts');
            const result = yield this.ajax.request(statsUrl, {
                method: 'POST',
                data: JSON.stringify({postUuids}),
                contentType: 'application/json'
            });
            // Parse the nested response structure
            const statsData = result.stats?.[0]?.data?.visitor_counts || {};
            
            // Merge with existing visitor counts instead of replacing
            this.visitorCounts = {
                ...this.visitorCounts,
                ...statsData
            };
        } catch (error) {
            // Rollback: remove failed UUIDs from fetched set to allow retry
            postUuids.forEach(uuid => this._fetchedUuids.delete(uuid));
            // Silent failure - visitor counts are not critical
            this.visitorCounts = this.visitorCounts || {};
        }
    }

    @task
    *_loadMemberCounts(posts) {
        try {
            const postIds = posts.map(post => post.id);
            const statsUrl = this.ghostPaths.url.api('stats/posts-member-counts');
            const result = yield this.ajax.request(statsUrl, {
                method: 'POST',
                data: JSON.stringify({postIds}),
                contentType: 'application/json'
            });
            
            // Parse the nested response structure - similar to visitor counts
            const memberData = result.stats?.[0] || {};
            
            // Convert from post ID -> counts to post UUID -> counts for consistency
            const memberCountsByUuid = {};
            posts.forEach((post) => {
                const memberCount = memberData[post.id];
                if (memberCount) {
                    memberCountsByUuid[post.uuid] = {
                        free: memberCount.free_members || 0,
                        paid: memberCount.paid_members || 0
                    };
                }
            });
            
            // Merge with existing member counts instead of replacing
            this.memberCounts = {
                ...this.memberCounts,
                ...memberCountsByUuid
            };
        } catch (error) {
            // Rollback: remove failed post IDs from fetched set to allow retry
            posts.forEach(post => this._fetchedMemberIds.delete(post.id));
            // Silent failure - member counts are not critical
            this.memberCounts = this.memberCounts || {};
        }
    }
} 