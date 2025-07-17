#!/usr/bin/env node

// Test the TinybirdFactory with real Tinybird instance
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testFactoryWithTinybird() {
    console.log('Testing TinybirdFactory with local Tinybird...\n');
    
    // Import the compiled factory
    const { TinybirdFactory } = require('../build/data-factory/factories/tinybird-factory');
    
    // Create factory with a test site UUID
    const siteUuid = 'test-ghost-site-' + Date.now();
    const factory = new TinybirdFactory(siteUuid);
    await factory.setup();
    
    console.log('Factory created with site UUID:', siteUuid);
    console.log('Tinybird host:', process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events');
    console.log('\n');
    
    try {
        // Test 1: Create a single page hit
        console.log('Test 1: Creating single page hit...');
        const hit = await factory.createPageHit({
            pathname: '/blog/test-post/',
            referrer: 'https://www.google.com/',
            member_status: 'free'
        });
        console.log('✅ Page hit created:', hit.payload.event_id);
        
        // Test 2: Create multiple page hits
        console.log('\nTest 2: Creating 3 page hits...');
        const hits = await factory.createPageHits(3, {
            pathname: '/about/',
            member_status: 'paid'
        });
        console.log('✅ Created', hits.length, 'page hits');
        
        // Test 3: Create page hit with full options
        console.log('\nTest 3: Creating page hit with all options...');
        const fullHit = await factory.createPageHit({
            timestamp: new Date(),
            post_uuid: 'test-post-uuid-123',
            member_uuid: 'test-member-uuid-456',
            member_status: 'comped',
            pathname: '/premium/exclusive-content/',
            referrer: 'https://newsletter.example.com/',
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            locale: 'fr-FR',
            location: 'FR'
        });
        console.log('✅ Full page hit created:', fullHit.payload.event_id);
        
        console.log('\n🎉 All tests passed! Events sent to Tinybird successfully.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Check if dotenv is available, if not use manual loading
try {
    require('dotenv');
} catch (e) {
    // Fallback to manual env loading
    const fs = require('fs');
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    process.env[key.trim()] = value.trim();
                }
            }
        });
    }
}

// Run the test
testFactoryWithTinybird().catch(console.error);