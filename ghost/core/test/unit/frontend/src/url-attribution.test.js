const should = require('should');
const sinon = require('sinon');
const {JSDOM} = require('jsdom');

// Use path relative to test file
const {
    parseReferrerData,
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
    
    describe('parseReferrerData', function () {
        it('should extract ref parameter correctly', function () {
            const result = parseReferrerData('https://example.com/?ref=newsletter');
            should.exist(result);
            should.equal(result.source, 'newsletter');
        });
        
        it('should extract source parameter correctly', function () {
            const result = parseReferrerData('https://example.com/?source=twitter');
            should.exist(result);
            should.equal(result.source, 'twitter');
        });
        
        it('should extract utm_source parameter correctly', function () {
            const result = parseReferrerData('https://example.com/?utm_source=facebook');
            should.exist(result);
            should.equal(result.source, 'facebook');
        });
        
        it('should handle portal hash URLs', function () {
            const result = parseReferrerData('https://example.com/#/portal/signup?ref=portal-hash');
            should.exist(result);
            should.equal(result.source, 'portal-hash');
        });
        
        it('should return document.referrer when no source params are present', function () {
            const result = parseReferrerData('https://example.com/');
            should.exist(result);
            should.equal(result.url, 'https://external-site.com/');
        });
        
        it('should extract all UTM parameters', function () {
            const result = parseReferrerData('https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=ghost&utm_content=banner');
            should.exist(result);
            should.equal(result.utmSource, 'google');
            should.equal(result.utmMedium, 'cpc');
            should.equal(result.utmCampaign, 'summer');
            should.equal(result.utmTerm, 'ghost');
            should.equal(result.utmContent, 'banner');
            should.equal(result.source, 'google'); // source should be utm_source
        });
    });
    
    describe('parseReferrerData with portal hash', function () {
        it('should extract parameters from portal hash URL', function () {
            const result = parseReferrerData('https://example.com/#/portal/signup?ref=newsletter');
            should.exist(result);
            should.equal(result.source, 'newsletter');
        });
        
        it('should handle multiple parameters in portal hash', function () {
            const result = parseReferrerData('https://example.com/#/portal/signup?ref=newsletter&utm_medium=email');
            should.exist(result);
            should.equal(result.source, 'newsletter');
            should.equal(result.medium, 'email');
        });
        
        it('should extract all UTM parameters from portal hash', function () {
            const result = parseReferrerData('https://example.com/#/portal/signup?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=ghost&utm_content=banner');
            should.exist(result);
            should.equal(result.utmSource, 'google');
            should.equal(result.utmMedium, 'cpc');
            should.equal(result.utmCampaign, 'summer');
            should.equal(result.utmTerm, 'ghost');
            should.equal(result.utmContent, 'banner');
            should.equal(result.source, 'google'); // source should be utm_source
        });
    });
    
    describe('getReferrer prioritization logic', function () {
        it('should prioritize ref/source over medium and document.referrer', function () {
            // When ref is present along with utm_medium
            const result = getReferrer('https://example.com/?ref=newsletter&utm_medium=email');
            should.equal(result, 'newsletter');
        });
        
        it('should prioritize utm_source over medium', function () {
            // When utm_source is present along with utm_medium
            const result = getReferrer('https://example.com/?utm_source=twitter&utm_medium=social');
            should.equal(result, 'twitter');
        });
        
        it('should fall back to utm_medium if no ref/source/utm_source', function () {
            // Only utm_medium is present
            const result = getReferrer('https://example.com/?utm_medium=email');
            should.equal(result, 'email');
        });
        
        it('should fall back to document.referrer if no params are present', function () {
            // No URL params, should use document.referrer (https://external-site.com/ from test setup)
            const result = getReferrer('https://example.com/');
            should.equal(result, 'https://external-site.com/');
        });
        
        it('should return null if referrer matches current hostname', function () {
            // Same-domain referrer should be filtered out
            const result = getReferrer('https://example.com/?ref=https://example.com/some-page');
            should.equal(result, null);
        });
        
        it('should return non-URL referrers like ghost-newsletter', function () {
            // Non-URL refs should work fine
            const result = getReferrer('https://example.com/?ref=ghost-newsletter');
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