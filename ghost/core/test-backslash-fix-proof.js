/**
 * Proof-of-concept test for bookmark thumbnail fix (Issue #20484)
 * 
 * This test demonstrates:
 * 1. The issue exists in metascraper v5.45.15 with normalize-url v6.1.0
 * 2. Our fix correctly resolves the issue
 * 3. Edge cases are handled properly
 * 
 * Run with: node test-backslash-fix-proof.js
 */

const metascraper = require('metascraper')([
    require('metascraper-url')(),
    require('metascraper-title')(),
    require('metascraper-description')(),
    require('metascraper-image')(),
    require('metascraper-logo')()
]);

const cheerio = require('cheerio');

// Import our fix function from the updated OEmbedService
const OEmbedService = require('./core/server/services/oembed/OEmbedService');

class TestResults {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    addTest(name, passed, message = '') {
        this.tests.push({ name, passed, message });
        if (passed) {
            this.passed++;
            console.log(`✅ ${name}`);
        } else {
            this.failed++;
            console.log(`❌ ${name} - ${message}`);
        }
    }

    summary() {
        console.log('\n' + '='.repeat(60));
        console.log(`📊 TEST SUMMARY: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(60));
        
        if (this.failed === 0) {
            console.log('🎉 ALL TESTS PASSED - Fix is working correctly!');
        } else {
            console.log('⚠️  Some tests failed - fix needs attention');
        }
        
        return this.failed === 0;
    }
}

async function testMetascraperIssue() {
    console.log('🔍 TESTING METASCRAPER ISSUE #20484');
    console.log('==================================\n');

    const results = new TestResults();

    // Test HTML with the exact issue from the GitHub report
    const komootLikeHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Komoot Tour - Hiking Route</title>
    <meta property="og:title" content="Beautiful Mountain Hiking Route">
    <meta property="og:description" content="A scenic hiking route through the mountains">
    <meta property="og:image" content="https://tourpic-vector.maps.komoot.net/r/big/u%60t%5Be_pC~EzKnI%60p@h@nf@xFzJeB~EdQdXbH%60e@pHvOsAxp@lO%60VnA%7CVvyAhnAbYff@~P~ItT%5CjNjm@%7CQtU/?width=768&height=576&crop=true">
    <meta property="og:url" content="https://www.komoot.com/tour/123456">
</head>
<body>
    <h1>Hiking Tour</h1>
    <p>Beautiful route through the mountains</p>
</body>
</html>`;

    console.log('1. Testing metascraper behavior with encoded backslash URLs:');
    console.log('   Original URL: https://...tT%5CjNjm@...');
    
    try {
        // Test metascraper directly
        const metascraperResult = await metascraper({
            html: komootLikeHtml,
            url: 'https://www.komoot.com/tour/123456'
        });

        console.log(`   Metascraper result: ${metascraperResult.image}`);
        
        // Check if metascraper broke the URL (converted %5C to /)
        const originalHas5C = komootLikeHtml.includes('%5C');
        const resultHas5C = metascraperResult.image?.includes('%5C');
        const resultHasForwardSlash = metascraperResult.image?.includes('tT/jNjm@');
        
        results.addTest(
            'Original HTML contains %5C', 
            originalHas5C,
            'HTML should contain encoded backslash'
        );
        
        results.addTest(
            'Metascraper converts %5C to / (demonstrates bug)', 
            !resultHas5C && resultHasForwardSlash,
            'This proves the issue exists in metascraper v5.45.15'
        );

        // Now test our fix
        console.log('\n2. Testing our fix:');
        
        const mockConfig = {
            get: () => 'test',
            getContentPath: () => '/tmp'
        };
        
        const mockStorage = {
            getStorage: () => ({
                getSanitizedFileName: (name) => name,
                generateUnique: async (dir, name, ext) => `${dir}/${name}${ext}`,
                saveRaw: async (buffer, path) => `http://localhost/${path}`
            })
        };
        
        const mockExternalRequest = async () => ({ body: Buffer.from('test'), headers: {} });
        
        const oembedService = new OEmbedService({
            config: mockConfig,
            storage: mockStorage,
            externalRequest: mockExternalRequest
        });

        // Test the fix function directly
        const fixedUrl = oembedService.fixIncorrectlyProcessedUrl(
            metascraperResult.image, 
            komootLikeHtml, 
            'og:image'
        );

        console.log(`   Fixed URL: ${fixedUrl}`);
        
        results.addTest(
            'Fix restores %5C in URL',
            fixedUrl.includes('%5C'),
            'Our fix should restore the encoded backslash'
        );
        
        results.addTest(
            'Fixed URL matches original',
            fixedUrl.includes('tT%5CjNjm@'),
            'Fixed URL should match the original pattern'
        );

    } catch (error) {
        results.addTest('Metascraper test execution', false, error.message);
    }

    return results;
}

async function testEdgeCases() {
    console.log('\n🧪 TESTING EDGE CASES');
    console.log('====================\n');

    const results = new TestResults();
    
    const mockConfig = {
        get: () => 'test',
        getContentPath: () => '/tmp'
    };
    
    const mockStorage = {
        getStorage: () => ({
            getSanitizedFileName: (name) => name,
            generateUnique: async (dir, name, ext) => `${dir}/${name}${ext}`,
            saveRaw: async (buffer, path) => `http://localhost/${path}`
        })
    };
    
    const mockExternalRequest = async () => ({ body: Buffer.from('test'), headers: {} });
    
    const oembedService = new OEmbedService({
        config: mockConfig,
        storage: mockStorage,
        externalRequest: mockExternalRequest
    });

    const testCases = [
        {
            name: 'Normal URL (should remain unchanged)',
            html: '<meta property="og:image" content="https://example.com/normal/image.jpg">',
            processedUrl: 'https://example.com/normal/image.jpg',
            shouldChange: false
        },
        {
            name: 'URL with lowercase %5c',
            html: '<meta property="og:image" content="https://example.com/path%5cbackslash/image.jpg">',
            processedUrl: 'https://example.com/path/backslash/image.jpg',
            shouldChange: true
        },
        {
            name: 'URL with multiple %5C',
            html: '<meta property="og:image" content="https://example.com/path%5Cwith%5Cmultiple/image.jpg">',
            processedUrl: 'https://example.com/path/with/multiple/image.jpg',
            shouldChange: true
        },
        {
            name: 'Twitter image fallback',
            html: '<meta name="twitter:image" content="https://example.com/path%5Cbackslash/image.jpg">',
            processedUrl: 'https://example.com/path/backslash/image.jpg',
            shouldChange: true
        },
        {
            name: 'Invalid HTML (should handle gracefully)',
            html: 'not valid html',
            processedUrl: 'https://example.com/image.jpg',
            shouldChange: false
        }
    ];

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        
        try {
            const result = oembedService.fixIncorrectlyProcessedUrl(
                testCase.processedUrl,
                testCase.html,
                'og:image'
            );
            
            if (testCase.shouldChange) {
                const containsBackslash = result.includes('%5C') || result.includes('%5c');
                results.addTest(
                    `${testCase.name} - should fix URL`,
                    containsBackslash,
                    `Expected URL to contain %5C, got: ${result}`
                );
            } else {
                const unchanged = result === testCase.processedUrl;
                results.addTest(
                    `${testCase.name} - should remain unchanged`,
                    unchanged,
                    `Expected no change, got: ${result}`
                );
            }
        } catch (error) {
            results.addTest(`${testCase.name} - execution`, false, error.message);
        }
    }

    return results;
}

async function testRealWorldExample() {
    console.log('\n🌍 TESTING REAL-WORLD EXAMPLE');
    console.log('=============================\n');

    const results = new TestResults();
    
    // Simulate the exact scenario from the GitHub issue
    const realWorldHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Ruta de senderismo - Komoot</title>
    <meta property="og:title" content="Hermosa ruta de montaña">
    <meta property="og:description" content="Una ruta escénica a través de las montañas con vistas impresionantes">
    <meta property="og:image" content="https://tourpic-vector.maps.komoot.net/r/big/u%60t%5Be_pC~EzKnI%60p@h@nf@xFzJeB~EdQdXbH%60e@pHvOsAxp@lO%60VnA%7CVvyAhnAbYff@~P~ItT%5CjNjm@%7CQtU/?width=768&height=576&crop=true">
    <meta property="og:url" content="https://www.komoot.com/es-es/tour/907703588">
    <meta property="og:site_name" content="Komoot">
    <meta property="og:type" content="website">
</head>
<body>
    <div id="app">
        <h1>Ruta de senderismo</h1>
        <p>Descripción de la ruta...</p>
    </div>
</body>
</html>`;

    console.log('Testing with realistic Komoot page structure...');
    
    try {
        // Test with metascraper to show the issue
        const metascraperResult = await metascraper({
            html: realWorldHtml,
            url: 'https://www.komoot.com/es-es/tour/907703588'
        });

        console.log('Metascraper extracted:');
        console.log(`  Title: ${metascraperResult.title}`);
        console.log(`  Description: ${metascraperResult.description}`);
        console.log(`  Image: ${metascraperResult.image}`);
        
        // Verify the issue exists
        const brokenUrl = metascraperResult.image;
        const hasBrokenPath = brokenUrl && brokenUrl.includes('tT/jNjm@') && !brokenUrl.includes('tT%5CjNjm@');
        
        results.addTest(
            'Real-world example shows metascraper issue',
            hasBrokenPath,
            'URL should have forward slash instead of %5C'
        );

        // Test our fix
        const mockOEmbedService = new (require('./core/server/services/oembed/OEmbedService'))({
            config: { get: () => 'test', getContentPath: () => '/tmp' },
            storage: { getStorage: () => ({
                getSanitizedFileName: (name) => name,
                generateUnique: async (dir, name, ext) => `${dir}/${name}${ext}`,
                saveRaw: async (buffer, path) => `http://localhost/${path}`
            }) },
            externalRequest: async () => ({ body: Buffer.from('test'), headers: {} })
        });

        const fixedUrl = mockOEmbedService.fixIncorrectlyProcessedUrl(
            brokenUrl,
            realWorldHtml,
            'og:image'
        );

        console.log(`Fixed URL: ${fixedUrl}`);
        
        results.addTest(
            'Fix works on real-world example',
            fixedUrl.includes('%5C'),
            'Fixed URL should contain %5C'
        );
        
        results.addTest(
            'Fixed URL is accessible format',
            fixedUrl.startsWith('https://') && fixedUrl.includes('komoot.net'),
            'URL should be properly formatted'
        );

    } catch (error) {
        results.addTest('Real-world example test', false, error.message);
    }

    return results;
}

async function runAllTests() {
    console.log('🚀 COMPREHENSIVE BOOKMARK THUMBNAIL FIX VERIFICATION');
    console.log('===================================================');
    console.log('Issue: https://github.com/TryGhost/Ghost/issues/20484');
    console.log('Problem: Bookmark thumbnails break on URLs with encoded backslashes');
    console.log('Root cause: normalize-url v6 converts %5C to / incorrectly');
    console.log('Solution: Detect and restore original URLs from HTML meta tags\n');

    const metascraperResults = await testMetascraperIssue();
    const edgeCaseResults = await testEdgeCases();
    const realWorldResults = await testRealWorldExample();

    // Combined summary
    const totalPassed = metascraperResults.passed + edgeCaseResults.passed + realWorldResults.passed;
    const totalFailed = metascraperResults.failed + edgeCaseResults.failed + realWorldResults.failed;
    const totalTests = totalPassed + totalFailed;

    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Total tests run: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`Success rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
    
    if (totalFailed === 0) {
        console.log('\n🎉 VERIFICATION COMPLETE!');
        console.log('✅ Issue confirmed and reproduced');
        console.log('✅ Fix implementation working correctly');
        console.log('✅ Edge cases handled properly');
        console.log('✅ Real-world scenario tested successfully');
        console.log('\n💯 This fix is ready for production deployment.');
        console.log('🚀 Bookmark thumbnails will now work correctly for URLs with encoded backslashes.');
    } else {
        console.log('\n⚠️  Some tests failed - please review the implementation.');
    }

    return totalFailed === 0;
}

// Run the tests
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(err => {
        console.error('💥 Test suite failed:', err);
        process.exit(1);
    });
}