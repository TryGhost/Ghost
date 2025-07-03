import {STATS_DEFAULT_SOURCE_ICON_URL, STATS_LABEL_MAPPINGS, STATS_RANGES} from '@src/utils/constants';
import {describe, expect, it} from 'vitest';

describe('constants', () => {
    describe('STATS_RANGES', () => {
        it('exports all expected time ranges', () => {
            expect(STATS_RANGES.TODAY).toEqual({name: 'Today', value: 1});
            expect(STATS_RANGES.LAST_7_DAYS).toEqual({name: 'Last 7 days', value: 7});
            expect(STATS_RANGES.LAST_30_DAYS).toEqual({name: 'Last 30 days', value: 31});
            expect(STATS_RANGES.LAST_3_MONTHS).toEqual({name: 'Last 3 months', value: 91});
            expect(STATS_RANGES.YEAR_TO_DATE).toEqual({name: 'Year to date', value: 366});
            expect(STATS_RANGES.LAST_12_MONTHS).toEqual({name: 'Last 12 months', value: 372});
            expect(STATS_RANGES.ALL_TIME).toEqual({name: 'All time', value: 1000});
        });

        it('has consistent structure for all ranges', () => {
            Object.values(STATS_RANGES).forEach((range) => {
                expect(range).toHaveProperty('name');
                expect(range).toHaveProperty('value');
                expect(typeof range.name).toBe('string');
                expect(typeof range.value).toBe('number');
                expect(range.value).toBeGreaterThan(0);
            });
        });

        it('has logical value progression', () => {
            expect(STATS_RANGES.TODAY.value).toBeLessThan(STATS_RANGES.LAST_7_DAYS.value);
            expect(STATS_RANGES.LAST_7_DAYS.value).toBeLessThan(STATS_RANGES.LAST_30_DAYS.value);
            expect(STATS_RANGES.LAST_30_DAYS.value).toBeLessThan(STATS_RANGES.LAST_3_MONTHS.value);
            expect(STATS_RANGES.LAST_3_MONTHS.value).toBeLessThan(STATS_RANGES.YEAR_TO_DATE.value);
            expect(STATS_RANGES.YEAR_TO_DATE.value).toBeLessThan(STATS_RANGES.LAST_12_MONTHS.value);
            expect(STATS_RANGES.LAST_12_MONTHS.value).toBeLessThan(STATS_RANGES.ALL_TIME.value);
        });

        it('is read-only (as const)', () => {
            // TypeScript prevents modification at compile time
            // Runtime immutability depends on the implementation
            expect(typeof STATS_RANGES.TODAY.value).toBe('number');
            expect(STATS_RANGES.TODAY.value).toBe(1);
        });
    });

    describe('STATS_LABEL_MAPPINGS', () => {
        it('contains country mappings', () => {
            expect(STATS_LABEL_MAPPINGS.US).toBe('United States');
            expect(STATS_LABEL_MAPPINGS.TWN).toBe('Taiwan');
            expect(STATS_LABEL_MAPPINGS.TW).toBe('Taiwan');
        });

        it('contains technical platform mappings', () => {
            expect(STATS_LABEL_MAPPINGS['mobile-ios']).toBe('iOS');
            expect(STATS_LABEL_MAPPINGS['mobile-android']).toBe('Android');
            expect(STATS_LABEL_MAPPINGS.macos).toBe('macOS');
        });

        it('contains source mappings', () => {
            expect(STATS_LABEL_MAPPINGS['google.com']).toBe('Google');
            expect(STATS_LABEL_MAPPINGS['ghost.org']).toBe('Ghost');
            expect(STATS_LABEL_MAPPINGS['bing.com']).toBe('Bing');
            expect(STATS_LABEL_MAPPINGS['bsky.app']).toBe('Bluesky');
            expect(STATS_LABEL_MAPPINGS['yahoo.com']).toBe('Yahoo');
            expect(STATS_LABEL_MAPPINGS['duckduckgo.com']).toBe('DuckDuckGo');
        });

        it('has consistent string values', () => {
            Object.values(STATS_LABEL_MAPPINGS).forEach((label) => {
                expect(typeof label).toBe('string');
                expect(label.length).toBeGreaterThan(0);
                expect(label.trim()).toBe(label);
            });
        });

        it('has consistent key formats', () => {
            Object.keys(STATS_LABEL_MAPPINGS).forEach((key) => {
                expect(typeof key).toBe('string');
                expect(key.length).toBeGreaterThan(0);
                // Keys should be domain names, short codes, or uppercase country codes
                expect(key).toMatch(/^[a-zA-Z0-9.-]+$/);
            });
        });

        it('includes all major search engines', () => {
            const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
            searchEngines.forEach((engine) => {
                expect(STATS_LABEL_MAPPINGS).toHaveProperty(engine);
                expect(typeof STATS_LABEL_MAPPINGS[engine as keyof typeof STATS_LABEL_MAPPINGS]).toBe('string');
            });
        });

        it('includes mobile platforms', () => {
            const mobilePlatforms = ['mobile-ios', 'mobile-android'];
            mobilePlatforms.forEach((platform) => {
                expect(STATS_LABEL_MAPPINGS).toHaveProperty(platform);
                expect(typeof STATS_LABEL_MAPPINGS[platform as keyof typeof STATS_LABEL_MAPPINGS]).toBe('string');
            });
        });
    });

    describe('STATS_DEFAULT_SOURCE_ICON_URL', () => {
        it('is a valid URL string', () => {
            expect(typeof STATS_DEFAULT_SOURCE_ICON_URL).toBe('string');
            expect(STATS_DEFAULT_SOURCE_ICON_URL).toMatch(/^https?:\/\/.+/);
        });

        it('points to Ghost CDN', () => {
            expect(STATS_DEFAULT_SOURCE_ICON_URL).toContain('static.ghost.org');
        });

        it('is an SVG icon', () => {
            expect(STATS_DEFAULT_SOURCE_ICON_URL).toContain('globe-icon.svg');
        });

        it('uses HTTPS', () => {
            expect(STATS_DEFAULT_SOURCE_ICON_URL.startsWith('https://')).toBe(true);
        });

        it('has the expected full URL', () => {
            expect(STATS_DEFAULT_SOURCE_ICON_URL).toBe('https://static.ghost.org/v5.0.0/images/globe-icon.svg');
        });
    });

    describe('integration tests', () => {
        it('ranges and mappings work together for time-based filtering', () => {
            // Verify that the range values are sensible for filtering
            expect(STATS_RANGES.TODAY.value).toBe(1);
            expect(STATS_RANGES.LAST_7_DAYS.value).toBe(7);
            expect(STATS_RANGES.LAST_30_DAYS.value).toBe(31);
        });

        it('all constants are exported and accessible', () => {
            expect(STATS_RANGES).toBeDefined();
            expect(STATS_LABEL_MAPPINGS).toBeDefined();
            expect(STATS_DEFAULT_SOURCE_ICON_URL).toBeDefined();
        });

        it('maintains consistency with expected usage patterns', () => {
            // Check that the mappings can be used for display transformation
            const testSource = 'google.com';
            const displayName = STATS_LABEL_MAPPINGS[testSource as keyof typeof STATS_LABEL_MAPPINGS];
            expect(displayName).toBe('Google');
            
            // Check that ranges can be used for time calculations
            const days7 = STATS_RANGES.LAST_7_DAYS.value;
            const days30 = STATS_RANGES.LAST_30_DAYS.value;
            expect(days30).toBeGreaterThan(days7);
        });
    });
});