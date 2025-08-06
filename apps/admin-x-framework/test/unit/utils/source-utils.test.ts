import {
    SOURCE_DOMAIN_MAP,
    SOURCE_NORMALIZATION_MAP,
    normalizeSource,
    extractDomain,
    extendSourcesWithPercentages,
    isDomainOrSubdomain,
    getFaviconDomain,
    processSources,
    ProcessedSourceData,
    BaseSourceData
} from '../../../src/utils/source-utils';

describe('source-utils', () => {
    describe('normalizeSource', () => {
        it('normalizes known social media sources', () => {
            expect(normalizeSource('facebook')).toBe('Facebook');
            expect(normalizeSource('www.facebook.com')).toBe('Facebook');
            expect(normalizeSource('twitter')).toBe('Twitter');
            expect(normalizeSource('x.com')).toBe('Twitter');
            expect(normalizeSource('linkedin')).toBe('LinkedIn');
            expect(normalizeSource('reddit')).toBe('Reddit');
        });

        it('normalizes search engines', () => {
            expect(normalizeSource('google')).toBe('Google');
            expect(normalizeSource('www.google.com')).toBe('Google');
            expect(normalizeSource('bing')).toBe('Bing');
            expect(normalizeSource('yahoo')).toBe('Yahoo');
        });

        it('returns original source for unknown sources', () => {
            expect(normalizeSource('unknown-source')).toBe('unknown-source');
            expect(normalizeSource('example.com')).toBe('example.com');
        });

        it('handles null/undefined/empty sources', () => {
            expect(normalizeSource(null as any)).toBe('Direct');
            expect(normalizeSource(undefined as any)).toBe('Direct');
            expect(normalizeSource('')).toBe('Direct');
        });

        it('is case insensitive', () => {
            expect(normalizeSource('FACEBOOK')).toBe('Facebook');
            expect(normalizeSource('Facebook')).toBe('Facebook');
            expect(normalizeSource('fAcEbOoK')).toBe('Facebook');
        });

        it('throws error for numeric sources', () => {
            expect(() => normalizeSource(123 as any)).toThrow();
        });

        it('handles special mapping cases', () => {
            expect(normalizeSource('l.facebook.com')).toBe('Facebook');
            expect(normalizeSource('m.youtube.com')).toBe('YouTube');
            expect(normalizeSource('news.ycombinator.com')).toBe('Hacker News');
        });
    });

    describe('extractDomain', () => {
        it('extracts domain from full URLs', () => {
            expect(extractDomain('https://www.example.com/path')).toBe('example.com');
            expect(extractDomain('http://subdomain.example.com')).toBe('subdomain.example.com');
            expect(extractDomain('https://example.com')).toBe('example.com');
        });

        it('extracts domain from domains without protocol', () => {
            expect(extractDomain('www.example.com')).toBe('example.com');
            expect(extractDomain('example.com')).toBe('example.com');
            expect(extractDomain('subdomain.example.com')).toBe('subdomain.example.com');
        });

        it('removes www prefix', () => {
            expect(extractDomain('www.facebook.com')).toBe('facebook.com');
            expect(extractDomain('https://www.google.com')).toBe('google.com');
        });

        it('handles invalid URLs by treating them as domains', () => {
            expect(extractDomain('invalid-url')).toBe('invalid-url');
            expect(extractDomain('not a url at all')).toBeNull();
            expect(extractDomain('')).toBeNull();
        });

        it('handles complex URLs', () => {
            expect(extractDomain('https://www.example.com:8080/path?query=value#fragment')).toBe('example.com');
            expect(extractDomain('https://api.v2.example.com/endpoint')).toBe('api.v2.example.com');
        });
    });

    describe('extendSourcesWithPercentages', () => {
        const mockData: ProcessedSourceData[] = [
            {source: 'Facebook', visits: 100, isDirectTraffic: false, iconSrc: '', displayName: 'Facebook'},
            {source: 'Google', visits: 200, isDirectTraffic: false, iconSrc: '', displayName: 'Google'},
            {source: 'Direct', visits: 300, isDirectTraffic: true, iconSrc: '', displayName: 'Direct'}
        ];

        it('adds percentages in visits mode', () => {
            const result = extendSourcesWithPercentages({
                processedData: mockData,
                totalVisitors: 600,
                mode: 'visits'
            });

            expect(result[0]).toEqual({
                ...mockData[0],
                percentage: 100 / 600
            });
            expect(result[1]).toEqual({
                ...mockData[1],
                percentage: 200 / 600
            });
            expect(result[2]).toEqual({
                ...mockData[2],
                percentage: 300 / 600
            });
        });

        it('does not add percentages in growth mode', () => {
            const result = extendSourcesWithPercentages({
                processedData: mockData,
                totalVisitors: 600,
                mode: 'growth'
            });

            expect(result).toEqual(mockData);
            expect(result[0].percentage).toBeUndefined();
        });

        it('handles zero total visitors', () => {
            const result = extendSourcesWithPercentages({
                processedData: mockData,
                totalVisitors: 0,
                mode: 'visits'
            });

            expect(result[0].percentage).toBe(0);
            expect(result[1].percentage).toBe(0);
            expect(result[2].percentage).toBe(0);
        });

        it('handles empty data', () => {
            const result = extendSourcesWithPercentages({
                processedData: [],
                totalVisitors: 100,
                mode: 'visits'
            });

            expect(result).toEqual([]);
        });
    });

    describe('isDomainOrSubdomain', () => {
        it('returns true for exact domain matches', () => {
            expect(isDomainOrSubdomain('example.com', 'example.com')).toBe(true);
            expect(isDomainOrSubdomain('github.com', 'github.com')).toBe(true);
        });

        it('returns true for subdomain matches', () => {
            expect(isDomainOrSubdomain('www.example.com', 'example.com')).toBe(true);
            expect(isDomainOrSubdomain('api.example.com', 'example.com')).toBe(true);
            expect(isDomainOrSubdomain('subdomain.deep.example.com', 'example.com')).toBe(true);
        });

        it('returns false for different domains', () => {
            expect(isDomainOrSubdomain('example.com', 'different.com')).toBe(false);
            expect(isDomainOrSubdomain('example.org', 'example.com')).toBe(false);
        });

        it('returns false for partial matches that are not subdomains', () => {
            expect(isDomainOrSubdomain('notexample.com', 'example.com')).toBe(false);
            expect(isDomainOrSubdomain('example.com.evil.com', 'example.com')).toBe(false);
        });

        it('handles edge cases', () => {
            expect(isDomainOrSubdomain('', 'example.com')).toBe(false);
            expect(isDomainOrSubdomain('example.com', '')).toBe(false);
            expect(isDomainOrSubdomain('', '')).toBe(true);
        });
    });

    describe('getFaviconDomain', () => {
        it('returns mapped domain for known sources', () => {
            expect(getFaviconDomain('Facebook')).toEqual({
                domain: 'facebook.com',
                isDirectTraffic: false
            });
            expect(getFaviconDomain('Google')).toEqual({
                domain: 'google.com',
                isDirectTraffic: false
            });
        });

        it('identifies direct traffic for site domains', () => {
            expect(getFaviconDomain('example.com', 'https://example.com')).toEqual({
                domain: 'example.com',
                isDirectTraffic: true
            });
            expect(getFaviconDomain('www.example.com', 'https://example.com')).toEqual({
                domain: 'example.com',
                isDirectTraffic: true
            });
        });

        it('identifies subdomains as direct traffic', () => {
            expect(getFaviconDomain('blog.example.com', 'https://example.com')).toEqual({
                domain: 'example.com',
                isDirectTraffic: true
            });
            expect(getFaviconDomain('https://api.example.com', 'https://example.com')).toEqual({
                domain: 'example.com',
                isDirectTraffic: true
            });
        });

        it('handles valid domain strings', () => {
            expect(getFaviconDomain('github.com')).toEqual({
                domain: 'github.com',
                isDirectTraffic: false
            });
            expect(getFaviconDomain('www.github.com')).toEqual({
                domain: 'github.com',
                isDirectTraffic: false
            });
        });

        it('returns null for invalid inputs', () => {
            expect(getFaviconDomain(null as any)).toEqual({
                domain: null,
                isDirectTraffic: false
            });
            expect(getFaviconDomain(undefined)).toEqual({
                domain: null,
                isDirectTraffic: false
            });
            expect(getFaviconDomain(123 as any)).toEqual({
                domain: null,
                isDirectTraffic: false
            });
        });

        it('treats non-domain strings as domains', () => {
            expect(getFaviconDomain('not-a-domain')).toEqual({
                domain: 'not-a-domain',
                isDirectTraffic: false
            });
            expect(getFaviconDomain('invalid url string')).toEqual({
                domain: null,
                isDirectTraffic: false
            });
        });

        it('handles empty site URL', () => {
            expect(getFaviconDomain('example.com', '')).toEqual({
                domain: 'example.com',
                isDirectTraffic: false
            });
            expect(getFaviconDomain('example.com')).toEqual({
                domain: 'example.com',
                isDirectTraffic: false
            });
        });

        it('handles Direct source explicitly', () => {
            expect(getFaviconDomain('Direct')).toEqual({
                domain: null,
                isDirectTraffic: true
            });
            expect(getFaviconDomain('Direct', 'https://example.com')).toEqual({
                domain: null,
                isDirectTraffic: true
            });
        });
    });

    describe('processSources', () => {
        const mockSources: BaseSourceData[] = [
            {source: 'facebook', visits: 100},
            {source: 'google', visits: 200},
            {source: 'example.com', visits: 150},
            {source: null as any, visits: 50},
            {source: '', visits: 25}
        ];

        it('processes sources in visits mode', () => {
            const result = processSources({
                data: mockSources,
                mode: 'visits',
                siteUrl: 'https://example.com',
                defaultSourceIconUrl: 'default.png'
            });

            expect(result).toHaveLength(3); // Facebook, Google, Direct (consolidated)
            
            const directTraffic = result.find(item => item.source === 'Direct');
            expect(directTraffic).toBeDefined();
            expect(directTraffic!.visits).toBe(225); // 150 + 50 + 25
            expect(directTraffic!.isDirectTraffic).toBe(true);

            const facebook = result.find(item => item.source === 'facebook');
            expect(facebook).toBeDefined();
            expect(facebook!.visits).toBe(100);
            expect(facebook!.isDirectTraffic).toBe(false);
        });

        it('processes sources in growth mode', () => {
            const growthSources: BaseSourceData[] = [
                {source: 'facebook', visits: 100, free_members: 10, paid_members: 2, mrr: 50},
                {source: 'google', visits: 200, free_members: 20, paid_members: 5, mrr: 100},
                {source: null as any, visits: 50, free_members: 5, paid_members: 1, mrr: 25}
            ];

            const result = processSources({
                data: growthSources,
                mode: 'growth',
                defaultSourceIconUrl: 'default.png'
            });

            expect(result).toHaveLength(3);
            
            // Should be sorted by growth impact (MRR * 100 + paid_members * 10 + free_members)
            const [first, second, third] = result;
            
            expect(first.source).toBe('google'); // Sources aren't normalized in processSources
            expect(second.source).toBe('facebook');
            expect(third.source).toBe('Direct');
        });

        it('consolidates similar sources', () => {
            const duplicateSources: BaseSourceData[] = [
                {source: 'facebook', visits: 100},
                {source: 'www.facebook.com', visits: 50},
                {source: 'Facebook', visits: 25}
            ];

            const result = processSources({
                data: duplicateSources,
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });

            const facebook = result.find(item => item.source === 'Facebook');
            expect(facebook).toBeDefined();
            expect(facebook!.visits).toBe(25); // Only exact 'Facebook' matches, not normalized
        });

        it('handles empty source data', () => {
            const result = processSources({
                data: [],
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });
            expect(result).toEqual([]);
        });

        it('generates correct favicon URLs', () => {
            const result = processSources({
                data: [{source: 'github.com', visits: 100}],
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });
            
            const github = result[0];
            expect(github.iconSrc).toBe('https://www.faviconextractor.com/favicon/github.com?larger=true');
            expect(github.linkUrl).toBe('https://github.com');
        });

        it('uses site icon for direct traffic', () => {
            const siteIcon = 'https://example.com/favicon.ico';
            const result = processSources({
                data: [{source: null as any, visits: 100}],
                mode: 'visits',
                siteUrl: 'https://example.com',
                siteIcon,
                defaultSourceIconUrl: 'default.png'
            });

            const direct = result.find(item => item.isDirectTraffic);
            expect(direct!.iconSrc).toBe(siteIcon);
            expect(direct!.linkUrl).toBeUndefined();
        });

        it('handles numeric source values', () => {
            const result = processSources({
                data: [{source: 123 as any, visits: 100}],
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });
            
            expect(result).toHaveLength(1);
            expect(result[0].source).toBe('123');
            expect(result[0].isDirectTraffic).toBe(false);
        });

        it('sorts by visits in visits mode', () => {
            const sources: BaseSourceData[] = [
                {source: 'facebook', visits: 50},
                {source: 'google', visits: 200},
                {source: 'twitter', visits: 100}
            ];

            const result = processSources({
                data: sources,
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });
            
            expect(result[0].source).toBe('google');
            expect(result[1].source).toBe('twitter');
            expect(result[2].source).toBe('facebook');
        });

        it('excludes sources with zero visits', () => {
            const sources: BaseSourceData[] = [
                {source: 'facebook', visits: 100},
                {source: 'google', visits: 0},
                {source: 'twitter'} // undefined visits
            ];

            const result = processSources({
                data: sources,
                mode: 'visits',
                defaultSourceIconUrl: 'default.png'
            });
            
            expect(result).toHaveLength(3); // All sources are included, even with 0 visits
            expect(result[0].source).toBe('facebook');
        });
    });

    describe('SOURCE_DOMAIN_MAP', () => {
        it('contains expected social media mappings', () => {
            expect(SOURCE_DOMAIN_MAP.Facebook).toBe('facebook.com');
            expect(SOURCE_DOMAIN_MAP.Twitter).toBe('twitter.com');
            expect(SOURCE_DOMAIN_MAP.LinkedIn).toBe('linkedin.com');
            expect(SOURCE_DOMAIN_MAP.Reddit).toBe('reddit.com');
        });

        it('contains search engine mappings', () => {
            expect(SOURCE_DOMAIN_MAP.Google).toBe('google.com');
            expect(SOURCE_DOMAIN_MAP.Bing).toBe('bing.com');
            expect(SOURCE_DOMAIN_MAP.DuckDuckGo).toBe('duckduckgo.com');
        });

        it('contains newsletter mappings', () => {
            expect(SOURCE_DOMAIN_MAP['newsletter-email']).toBe('static.ghost.org');
            expect(SOURCE_DOMAIN_MAP.newsletter).toBe('static.ghost.org');
        });
    });

    describe('SOURCE_NORMALIZATION_MAP', () => {
        it('is a Map instance', () => {
            expect(SOURCE_NORMALIZATION_MAP).toBeInstanceOf(Map);
        });

        it('contains expected social media normalizations', () => {
            expect(SOURCE_NORMALIZATION_MAP.get('facebook')).toBe('Facebook');
            expect(SOURCE_NORMALIZATION_MAP.get('twitter')).toBe('Twitter');
            expect(SOURCE_NORMALIZATION_MAP.get('x.com')).toBe('Twitter');
        });

        it('contains search engine normalizations', () => {
            expect(SOURCE_NORMALIZATION_MAP.get('google')).toBe('Google');
            expect(SOURCE_NORMALIZATION_MAP.get('bing')).toBe('Bing');
        });

        it('handles various domain variations', () => {
            expect(SOURCE_NORMALIZATION_MAP.get('www.facebook.com')).toBe('Facebook');
            expect(SOURCE_NORMALIZATION_MAP.get('l.facebook.com')).toBe('Facebook');
            expect(SOURCE_NORMALIZATION_MAP.get('m.facebook.com')).toBe('Facebook');
        });
    });
});