const should = require('should');
const sinon = require('sinon');
const {JSDOM} = require('jsdom');

// Use path relative to test file
const {
    parseReferrer,
    parsePortalHash,
    getFinalReferrer,
    getReferrer
} = require('../../../../core/frontend/src/utils/url-attribution');

describe('URL Attribution Utils', function () {
    let dom;
    let originalWindow;
    let originalURL;

    beforeEach(function () {
        // Save original globals
        originalWindow = global.window;
        originalURL = global.URL;
        
        // Set up JSDOM environment
        dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
            url: 'https://example.com/path',
            referrer: 'https://external-site.com',
            contentType: 'text/html',
            includeNodeLocations: true
        });
        
        // Set global window and URL
        global.window = dom.window;
        global.URL = dom.window.URL;
        global.document = dom.window.document;
    });
    
    afterEach(function () {
        sinon.restore();
        
        // Clean up JSDOM
        dom.window.close();
        
        // Restore globals
        global.window = originalWindow;
        global.URL = originalURL;
        global.document = undefined;
    });
    
    describe('parseReferrer', function () {
        it('should extract ref parameter correctly', function () {
            const result = parseReferrer('https://example.com/?ref=newsletter');
            should.exist(result);
            should.equal(result.source, 'newsletter');
        });
        
        it('should extract source parameter correctly', function () {
            const result = parseReferrer('https://example.com/?source=twitter');
            should.exist(result);
            should.equal(result.source, 'twitter');
        });
        
        it('should extract utm_source parameter correctly', function () {
            const result = parseReferrer('https://example.com/?utm_source=facebook');
            should.exist(result);
            should.equal(result.source, 'facebook');
        });
        
        it('should handle portal hash URLs', function () {
            const result = parseReferrer('https://example.com/#/portal/signup?ref=portal-hash');
            should.exist(result);
            should.equal(result.source, 'portal-hash');
        });
        
        it('should return document.referrer when no source params are present', function () {
            const result = parseReferrer('https://example.com/');
            should.exist(result);
            should.equal(result.url, 'https://external-site.com/');
        });
    });
    
    describe('parsePortalHash', function () {
        it('should extract parameters from portal hash URL', function () {
            const url = new URL('https://example.com/#/portal/signup?ref=newsletter');
            const result = parsePortalHash(url);
            should.exist(result);
            should.equal(result.source, 'newsletter');
        });
        
        it('should handle multiple parameters', function () {
            const url = new URL('https://example.com/#/portal/signup?ref=newsletter&utm_medium=email');
            const result = parsePortalHash(url);
            should.exist(result);
            should.equal(result.source, 'newsletter');
            should.equal(result.medium, 'email');
        });
    });
    
    describe('getFinalReferrer', function () {
        it('should prioritize source over medium and url', function () {
            const referrerData = {
                source: 'newsletter',
                medium: 'email',
                url: 'https://external-site.com'
            };
            
            const result = getFinalReferrer(referrerData);
            should.equal(result, 'newsletter');
        });
        
        it('should fall back to medium if source is not available', function () {
            const referrerData = {
                source: null,
                medium: 'email',
                url: 'https://external-site.com'
            };
            
            const result = getFinalReferrer(referrerData);
            should.equal(result, 'email');
        });
        
        it('should fall back to url if source and medium are not available', function () {
            const referrerData = {
                source: null,
                medium: null,
                url: 'https://external-site.com'
            };
            
            const result = getFinalReferrer(referrerData);
            should.equal(result, 'https://external-site.com');
        });
        
        it('should return null if referrer matches current hostname', function () {
            const referrerData = {
                source: 'https://example.com/some-page',
                medium: null,
                url: null
            };
            
            const result = getFinalReferrer(referrerData);
            should.equal(result, null);
        });
        
        it('should return non-URL referrers even if hostname parsing fails', function () {
            const referrerData = {
                source: 'ghost-newsletter',
                medium: null,
                url: null
            };
            
            const result = getFinalReferrer(referrerData);
            should.equal(result, 'ghost-newsletter');
        });
    });
    
    describe('getReferrer', function () {
        it('should combine parse and final referrer functions', function () {
            const result = getReferrer('https://example.com/?ref=newsletter');
            should.equal(result, 'newsletter');
        });
        
        it('should return null for same-domain referrers', function () {
            const result = getReferrer('https://example.com/?ref=https://example.com/page');
            should.equal(result, null);
        });
    });
}); 