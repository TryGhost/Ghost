#!/usr/bin/env node
/* eslint-disable ghost/filenames/match-exported-class */
/* eslint-disable no-console */
/* eslint-disable ghost/ghost-custom/no-native-error */
/**
 * Analytics Events NDJSON Generator
 * Generates realistic analytics events using real Ghost post UUIDs
 */

const fs = require('fs');
const readline = require('readline');
const DatabaseUtils = require('./database-utils');

class AnalyticsEventGenerator {
    constructor() {
        this.db = new DatabaseUtils();
        
        // Will be populated from database with published dates
        this.posts = []; // Array of {uuid, slug, type, published_at, popularity}
        this.memberUuids = [];
        this.siteConfig = {};
        this.stats = {};
        
        // Static pages (not tied to posts)
        this.staticPages = [
            {value: {pathname: '/', type: 'homepage'}, weight: 40},
            {value: {pathname: '/about/', type: 'page'}, weight: 8},
            {value: {pathname: '/pricing/', type: 'page'}, weight: 6},
            {value: {pathname: '/contact/', type: 'page'}, weight: 4},
            {value: {pathname: '/services/', type: 'page'}, weight: 3},
            {value: {pathname: '/team/', type: 'page'}, weight: 3},
            {value: {pathname: '/privacy/', type: 'page'}, weight: 3},
            {value: {pathname: '/terms/', type: 'page'}, weight: 2}
        ];
        
        // Referrer sources based on production data analysis
        this.referrerWeights = [
            // Direct traffic (empty referrer)
            {value: '', weight: 25},
            
            // Major search engines
            {value: 'https://www.google.com/', weight: 20},
            {value: 'https://news.google.com/', weight: 3},
            {value: 'https://duckduckgo.com/', weight: 2},
            {value: 'https://www.bing.com/', weight: 1},
            
            // Social media platforms
            {value: 'https://out.reddit.com/', weight: 8},
            {value: 'https://www.reddit.com/', weight: 4},
            {value: 'https://go.bsky.app/', weight: 6},
            {value: 'https://t.co/', weight: 4},
            {value: 'https://lm.facebook.com/', weight: 2},
            {value: 'http://m.facebook.com/', weight: 1},
            
            // Newsletter sources
            {value: 'duonews', weight: 9},
            {value: 'tangle-newsletter', weight: 3},
            {value: 'the-51st-newsletter', weight: 3},
            {value: 'newsletter-email', weight: 3},
            {value: 'daily-stories-newsletter', weight: 2},
            {value: 'weekly-roundup-newsletter', weight: 1},
            {value: 'newsletter', weight: 1},
            
            // Mobile apps
            {value: 'android-app://com.google.android.googlequicksearchbox/', weight: 4},
            {value: 'android-app://com.reddit.frontpage/', weight: 1},
            
            // Other sources
            {value: 'https://alohafind.com/', weight: 3},
            {value: 'flipboard', weight: 2}
        ];
        
        // Referrer source mapping (for meta.referrerSource)
        this.referrerSourceMap = {
            'https://www.google.com/': 'Google',
            'https://news.google.com/': 'Google News',
            'https://duckduckgo.com/': 'DuckDuckGo',
            'https://www.bing.com/': 'Bing',
            'https://out.reddit.com/': 'Reddit',
            'https://www.reddit.com/': 'Reddit',
            'android-app://com.reddit.frontpage/': 'Reddit',
            'https://go.bsky.app/': 'Bluesky',
            'https://t.co/': 'Twitter',
            'https://lm.facebook.com/': 'Facebook',
            'http://m.facebook.com/': 'Facebook',
            'https://alohafind.com/': 'alohafind.com',
            flipboard: 'Flipboard',
            duonews: 'duonews',
            'tangle-newsletter': 'tangle-newsletter',
            'the-51st-newsletter': 'the-51st-newsletter',
            'newsletter-email': 'newsletter-email',
            'daily-stories-newsletter': 'daily-stories-newsletter',
            'weekly-roundup-newsletter': 'weekly-roundup-newsletter',
            newsletter: 'newsletter',
            'android-app://com.google.android.googlequicksearchbox/': 'Google'
        };
        
        // User agents (realistic ones)
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/4.0)',
            'Mozilla/5.0 (Windows; U; Windows NT 5.2) AppleWebKit/533.2.1 (KHTML, like Gecko) Chrome/13.0.868.0 Safari/533.2.1',
            'AhrefsBot/7.0; +http://ahrefs.com/robot/'
        ];
        
        // Locales
        this.locales = [
            'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'
        ];
        
        // Weighted distributions based on production data
        this.memberStatusWeights = [
            {value: 'undefined', weight: 83},
            {value: 'paid', weight: 9},
            {value: 'free', weight: 8},
            {value: 'comped', weight: 1}
        ];
        
        this.postTypeWeights = [
            {value: 'post', weight: 60},
            {value: 'page', weight: 30},
            {value: '', weight: 10} // Empty string for homepage/undefined
        ];
        
        // Top locations (covers ~95% of traffic)
        this.locationWeights = [
            {value: 'US', weight: 62},
            {value: 'GB', weight: 15},
            {value: 'CA', weight: 3},
            {value: 'DE', weight: 3},
            {value: 'ES', weight: 3},
            {value: 'FR', weight: 3},
            {value: 'AU', weight: 2},
            {value: 'IT', weight: 2},
            {value: 'JP', weight: 2},
            {value: 'Others', weight: 5}
        ];
        
        // User and session configuration
        this.userCount = 200; // Increased for more variability
        this.maxSessionDurationHours = 3;
        this.userSessions = new Map(); // Track sessions per user
        
        // Post popularity weights (will be applied to real posts)
        this.postPopularityTiers = [
            {tier: 'viral', weight: 8, multiplier: 50}, // 8% of posts get 50x traffic (viral hits)
            {tier: 'popular', weight: 12, multiplier: 12}, // 12% get 12x traffic 
            {tier: 'good', weight: 20, multiplier: 4}, // 20% get 4x traffic
            {tier: 'average', weight: 30, multiplier: 1}, // 30% get normal traffic
            {tier: 'low', weight: 20, multiplier: 0.2}, // 20% get 20% of normal traffic
            {tier: 'very_low', weight: 10, multiplier: 0.05} // 10% get almost no traffic
        ];
        this.postPopularityMap = new Map(); // Will store post UUIDs with their popularity tiers
        
        // Site configuration - will be populated from database
        this.siteUuid = 'mock_site_uuid';
        this.baseUrl = 'https://my-ghost-site.com';
    }
    
    /**
     * Initialize the generator by loading data from the database
     */
    async init() {
        try {
            console.log('Initializing analytics generator with database data...');
            
            // Load posts with published dates and slugs
            this.posts = await this.db.getPostsWithDetails({publishedOnly: true});
            
            // Load members
            this.memberUuids = await this.db.getMemberUuids({limit: 500});
            
            // Load site config
            this.siteConfig = await this.db.getSiteConfig();
            if (this.siteConfig.url) {
                this.baseUrl = this.siteConfig.url;
            }
            
            this.stats = await this.db.getStats();
            
            console.log(`✅ Successfully loaded ${this.posts.length} posts with details from database`);
            console.log(`✅ Successfully loaded ${this.memberUuids.length} member UUIDs from database`);
            console.log(`✅ Site URL: ${this.baseUrl}`);
            
            // Assign popularity tiers to posts
            this.assignPostPopularity();
            
            // Add site-specific referrer
            if (this.baseUrl && !this.referrerWeights.find(r => r.value === this.baseUrl)) {
                this.referrerWeights.push({value: this.baseUrl, weight: 5});
                this.referrerSourceMap[this.baseUrl] = this.baseUrl.replace('https://', '').replace('http://', '');
            }
            
            if (this.posts.length === 0) {
                throw new Error('No posts found in database. Please run "yarn reset:data" first to generate Ghost data.');
            }
            
            if (this.memberUuids.length === 0) {
                console.warn('⚠️  No members found in database - analytics will not include member data');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Ghost database:', error.message);
            console.log('');
            
            // Check if this is a database connection issue
            if (error.message.includes('sqlite3') || error.message.includes('bindings')) {
                console.log('🔧 This appears to be a sqlite3 binding issue with your Node.js version.');
                console.log('   You can fix this by running: yarn rebuild sqlite3');
                console.log('');
            }
            
            // Offer to generate mock data instead
            const shouldUseMockData = await this.promptForMockData();
            
            if (shouldUseMockData) {
                console.log('📝 Generating mock data with random UUIDs...');
                this.generateMockData();
                return true;
            } else {
                console.log('❌ Cannot proceed without database connection or mock data.');
                console.log('');
                console.log('Solutions:');
                console.log('1. Fix database connection: yarn rebuild sqlite3');
                console.log('2. Reset Ghost data first: yarn reset:data');
                console.log('3. Use complete workflow: yarn reset:data:tinybird');
                process.exit(1);
            }
        }
    }
    
    /**
     * Prompt user whether to use mock data when database fails
     */
    async promptForMockData() {
        // Check if running in non-interactive environment
        if (!process.stdin.isTTY) {
            console.log('🤖 Non-interactive environment detected - failing without mock data');
            return false;
        }
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('Generate mock analytics data with random UUIDs instead? (y/N): ', (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }
    
    /**
     * Generate mock posts with realistic slugs and published dates
     */
    generateMockData() {
        const now = new Date();
        const elevenMonthsAgo = new Date(now.getTime() - (335 * 24 * 60 * 60 * 1000));
        
        // Generate mock posts with realistic slugs
        const mockPostSlugs = [
            'hello-world',
            'getting-started-with-ghost',
            'advanced-features-guide',
            'tips-and-tricks',
            'best-practices',
            'troubleshooting-guide',
            'performance-optimization',
            'security-tips',
            'design-principles',
            'user-experience-matters'
        ];
        
        this.posts = mockPostSlugs.map((slug) => {
            // Spread published dates over 11 months, with more recent posts
            const daysAgo = Math.floor(Math.random() * 335);
            const publishedAt = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            
            return {
                uuid: this.generateUuid(),
                slug: slug,
                type: 'post',
                published_at: publishedAt,
                pathname: `/blog/${slug}/`
            };
        });
        
        // Generate some mock pages
        const mockPages = [
            {slug: 'about', pathname: '/about/'},
            {slug: 'pricing', pathname: '/pricing/'},
            {slug: 'contact', pathname: '/contact/'}
        ];
        
        mockPages.forEach((page) => {
            this.posts.push({
                uuid: this.generateUuid(),
                slug: page.slug,
                type: 'page',
                published_at: elevenMonthsAgo, // Pages published early
                pathname: page.pathname
            });
        });
        
        // Generate random member UUIDs  
        this.memberUuids = Array.from({length: 50}, () => this.generateUuid());
        
        this.assignPostPopularity();
        
        console.log(`📊 Generated ${this.posts.length} mock posts/pages with realistic slugs`);
        console.log(`👥 Generated ${this.memberUuids.length} mock member UUIDs`);
    }
    
    /**
     * Assign popularity tiers to posts for realistic traffic distribution
     */
    assignPostPopularity() {
        this.postPopularityMap.clear();
        
        // Shuffle posts for random assignment
        const shuffledPosts = [...this.posts].sort(() => Math.random() - 0.5);
        
        let postIndex = 0;
        for (const tier of this.postPopularityTiers) {
            const tierCount = Math.ceil((tier.weight / 100) * shuffledPosts.length);
            
            for (let i = 0; i < tierCount && postIndex < shuffledPosts.length; i = i + 1) {
                this.postPopularityMap.set(shuffledPosts[postIndex].uuid, {
                    tier: tier.tier,
                    multiplier: tier.multiplier
                });
                postIndex = postIndex + 1;
            }
        }
        
        console.log(`📈 Assigned popularity tiers to ${this.postPopularityMap.size} posts`);
    }
    
    /**
     * Select content (post, page, or homepage) with proper pathname/UUID matching
     */
    selectContent() {
        // 40% chance for static pages (including homepage)
        if (Math.random() < 0.4) {
            const staticPage = this.weightedChoice(this.staticPages);
            return {
                post_uuid: 'undefined',
                post_type: staticPage.type === 'homepage' ? '' : 'page',
                pathname: staticPage.pathname,
                published_at: null // Static pages don't have publication restrictions
            };
        }
        
        // 60% chance for posts/pages from database
        const weightedPosts = [];
        
        for (const post of this.posts) {
            const popularity = this.postPopularityMap.get(post.uuid) || {multiplier: 1};
            const weight = Math.ceil(popularity.multiplier * 10);
            
            for (let i = 0; i < weight; i = i + 1) {
                weightedPosts.push(post);
            }
        }
        
        const selectedPost = this.randomChoice(weightedPosts);
        
        return {
            post_uuid: selectedPost.uuid,
            post_type: selectedPost.type,
            pathname: selectedPost.pathname,
            published_at: selectedPost.published_at
        };
    }
    
    /**
     * Generate a realistic UUID for member_uuid
     */
    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Select item based on weighted distribution
     */
    weightedChoice(weights) {
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.value;
            }
        }
        
        return weights[weights.length - 1].value;
    }
    
    /**
     * Generate realistic session ID - sequential per user, max 3 hours duration
     */
    generateSessionId(userId, timestamp) {
        const userKey = `user_${userId}`;
        
        if (!this.userSessions.has(userKey)) {
            this.userSessions.set(userKey, []);
        }
        
        const userSessionData = this.userSessions.get(userKey);
        
        // Check if we can reuse an existing session (within 3 hours)
        for (let session of userSessionData) {
            const timeDiff = (timestamp.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
            if (timeDiff <= this.maxSessionDurationHours && timeDiff >= 0) {
                return session.sessionId;
            }
        }
        
        // Create new session with UUID format
        const sessionId = this.generateUuid();
        
        userSessionData.push({
            sessionId: sessionId,
            startTime: timestamp
        });
        
        return sessionId;
    }
    
    /**
     * Generate timestamp that respects post publication date
     */
    generateTimestamp(eventIndex = 0, totalEvents = 50000, publishedAt = null) {
        const now = new Date();
        let startDate = new Date(now.getTime() - (335 * 24 * 60 * 60 * 1000)); // 11 months ago
        
        // If content has a publication date, ensure views only happen after publication
        if (publishedAt) {
            const pubDate = new Date(publishedAt);
            if (pubDate > startDate) {
                startDate = pubDate;
            }
        }
        
        // Ensure we don't try to generate dates in an invalid range
        if (startDate >= now) {
            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Fall back to last week
        }
        
        const normalizedIndex = eventIndex / totalEvents;
        const growthBias = Math.pow(normalizedIndex, 0.5);
        const randomWeight = Math.pow(Math.random(), 1 - growthBias);
        const timePosition = randomWeight;
        
        const baseTimestamp = startDate.getTime() + (timePosition * (now.getTime() - startDate.getTime()));
        const randomOffset = (Math.random() - 0.5) * 12 * 60 * 60 * 1000;
        
        const date = new Date(baseTimestamp + randomOffset);
        
        // Apply realistic traffic patterns (same as before)
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        
        let weekdayMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;
        let hourMultiplier = 1;
        if (hour >= 9 && hour <= 17) {
            hourMultiplier = 1.3;
        } else if (hour >= 19 && hour <= 22) {
            hourMultiplier = 1.1;
        } else if (hour >= 0 && hour <= 6) {
            hourMultiplier = 0.3;
        }
        
        const trafficProbability = weekdayMultiplier * hourMultiplier * 0.8;
        if (Math.random() > trafficProbability) {
            return this.generateTimestamp(eventIndex + Math.random() * 0.1, totalEvents, publishedAt);
        }
        
        return date;
    }
    
    /**
     * Get random array element
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * Format timestamp to match the schema format
     */
    formatTimestamp(date) {
        return date.toISOString().replace('T', ' ').replace('Z', '');
    }
    
    /**
     * Generate a single analytics event with proper content/pathname matching
     */
    generateEvent(eventIndex = 0, totalEvents = 1000) {
        const userId = Math.floor(Math.random() * this.userCount) + 1;
        
        // Select content first (this determines both pathname and post_uuid)
        const content = this.selectContent();
        
        // Generate timestamp that respects publication date
        const timestamp = this.generateTimestamp(eventIndex, totalEvents, content.published_at);
        
        const sessionId = this.generateSessionId(userId, timestamp);
        const memberStatus = this.weightedChoice(this.memberStatusWeights);
        const referrer = this.weightedChoice(this.referrerWeights);
        
        // Generate member_uuid based on status
        let memberUuid;
        if (memberStatus === 'undefined') {
            memberUuid = 'undefined';
        } else if (this.memberUuids.length > 0 && Math.random() < 0.7) {
            memberUuid = this.randomChoice(this.memberUuids);
        } else {
            memberUuid = this.generateUuid();
        }
        
        // Generate referrerSource for meta field
        const referrerSource = this.referrerSourceMap[referrer] || referrer;
        
        const payload = {
            site_uuid: this.siteUuid,
            member_uuid: memberUuid,
            member_status: memberStatus,
            post_uuid: content.post_uuid,
            post_type: content.post_type,
            'user-agent': this.randomChoice(this.userAgents),
            locale: this.randomChoice(this.locales),
            location: this.weightedChoice(this.locationWeights),
            referrer: referrer,
            pathname: content.pathname,
            href: `${this.baseUrl}${content.pathname}`,
            meta: {
                referrerSource: referrerSource
            }
        };
        
        return {
            timestamp: this.formatTimestamp(timestamp),
            session_id: sessionId,
            action: 'page_hit',
            version: '1',
            payload: payload
        };
    }
    
    /**
     * Generate NDJSON file with analytics events
     */
    async generateNdjson(numEvents = 1000, outputFile = null) {
        // Determine output file path based on current working directory
        if (!outputFile) {
            if (process.cwd().endsWith('ghost/core')) {
                outputFile = './core/server/data/tinybird/fixtures/analytics_events.ndjson';
            } else {
                outputFile = '../fixtures/analytics_events.ndjson';
            }
        }
        // Ensure we're initialized
        if (this.posts.length === 0) {
            await this.init();
        }
        
        // Reset session tracking for each generation
        this.userSessions.clear();
        
        // Generate events and sort by timestamp for realistic session flow
        const events = [];
        
        const now = new Date();
        const elevenMonthsAgo = new Date(now.getTime() - (335 * 24 * 60 * 60 * 1000)); // ~11 months
        
        console.log(`Generating ${numEvents} events over 11 months with gradual growth...`);
        console.log(`📅 Time range: ${elevenMonthsAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
        console.log(`📈 Traffic pattern: Moderate growth over time with realistic seasonal patterns`);
        console.log(`⏰ Includes realistic daily/weekly patterns (weekdays > weekends, business hours > nights)`);
        console.log(`🔗 Using production-based referrer patterns (Google, Reddit, Bluesky, newsletters, etc.)`);
        
        for (let i = 0; i < numEvents; i++) {
            events.push(this.generateEvent(i, numEvents));
            
            if (i % 10000 === 0 && i > 0) {
                console.log(`Generated ${i} events...`);
            }
        }
        
        // Sort events by timestamp for realistic chronological order
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Re-generate session IDs in chronological order for proper sequencing
        this.userSessions.clear();
        events.forEach((event) => {
            // Extract user ID from a consistent method
            const userId = Math.abs(event.payload.member_uuid.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0)) % this.userCount + 1;
            
            event.session_id = this.generateSessionId(userId, new Date(event.timestamp));
        });
        
        const ndjsonContent = events.map(event => JSON.stringify(event)).join('\n');
        fs.writeFileSync(outputFile, ndjsonContent);
        
        const fileSizeMB = (fs.statSync(outputFile).size / (1024 * 1024)).toFixed(2);
        console.log(`Generated ${numEvents} events in ${outputFile}`);
        console.log(`File size: ${fileSizeMB} MB`);
        
        return outputFile;
    }
    
    /**
     * Close database connection
     */
    async close() {
        await this.db.close();
    }
}

async function main() {
    console.log('Analytics Events Generator with Real Ghost Data');
    console.log('='.repeat(50));
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let numEvents = 1000; // default
    let forceMockData = false;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--mock' || arg === '-m') {
            forceMockData = true;
        } else {
            const parsed = parseInt(arg);
            if (!isNaN(parsed) && parsed > 0) {
                numEvents = parsed;
            }
        }
    }
    
    const generator = new AnalyticsEventGenerator();
    
    try {
        // Skip database initialization if forcing mock data
        let initialized;
        if (forceMockData) {
            console.log('🎭 Force mock data mode enabled - skipping database connection');
            generator.generateMockData();
            initialized = true;
        } else {
            initialized = await generator.init();
        }
        
        if (!initialized) {
            console.log('❌ Failed to initialize generator');
            process.exit(1);
        }
        
        console.log(`Generating ${numEvents} events...`);
        
        // Generate events and write to fixtures directory
        const outputFile = await generator.generateNdjson(numEvents);
        
        console.log(`\nGenerated ${numEvents} events in ${outputFile}`);
        
        // Show sample event
        const sampleEvent = generator.generateEvent();
        console.log('\nSample event:');
        console.log(JSON.stringify(sampleEvent, null, 2));
    } catch (error) {
        console.error('Error generating analytics events:', error);
        process.exit(1);
    } finally {
        await generator.close();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AnalyticsEventGenerator;