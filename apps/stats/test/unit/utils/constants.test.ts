import {
    STATS_DEFAULT_RANGE_KEY,
    STATS_DEFAULT_SOURCE_ICON_URL,
    STATS_LABEL_MAPPINGS,
    STATS_RANGE_OPTIONS
} from '@src/utils/constants';

describe('Constants', function () {
    test('STATS_RANGE_OPTIONS contains expected values', function () {
        expect(STATS_RANGE_OPTIONS).toBeInstanceOf(Array);
        expect(STATS_RANGE_OPTIONS.length).toBeGreaterThan(0);
        
        // Check structure of each item
        STATS_RANGE_OPTIONS.forEach((option) => {
            expect(option).toHaveProperty('name');
            expect(option).toHaveProperty('value');
            expect(typeof option.name).toBe('string');
            expect(typeof option.value).toBe('number');
        });
        
        // Verify specific options exist
        const allTimeOption = STATS_RANGE_OPTIONS.find(opt => opt.name === 'All time');
        expect(allTimeOption).toBeDefined();
        expect(allTimeOption?.value).toBe(1000);
        
        const todayOption = STATS_RANGE_OPTIONS.find(opt => opt.name === 'Today');
        expect(todayOption).toBeDefined();
        expect(todayOption?.value).toBe(1);
    });
    
    test('STATS_DEFAULT_RANGE_KEY has correct value', function () {
        expect(STATS_DEFAULT_RANGE_KEY).toBe(2);
        // Verify it's a valid index for STATS_RANGE_OPTIONS
        expect(STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY]).toBeDefined();
    });
    
    test('STATS_LABEL_MAPPINGS contains expected mappings', function () {
        expect(STATS_LABEL_MAPPINGS).toBeInstanceOf(Object);
        
        // Check some specific mappings
        expect(STATS_LABEL_MAPPINGS.US).toBe('United States');
        expect(STATS_LABEL_MAPPINGS.TWN).toBe('Taiwan');
        expect(STATS_LABEL_MAPPINGS['mobile-ios']).toBe('iOS');
        expect(STATS_LABEL_MAPPINGS['google.com']).toBe('Google');
    });
    
    test('STATS_DEFAULT_SOURCE_ICON_URL has correct value', function () {
        expect(STATS_DEFAULT_SOURCE_ICON_URL).toBe('https://static.ghost.org/v5.0.0/images/globe-icon.svg');
        expect(STATS_DEFAULT_SOURCE_ICON_URL).toMatch(/^https:\/\//);
    });
}); 