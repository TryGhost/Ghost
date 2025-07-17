#!/usr/bin/env node

// Test script to submit an event to local Tinybird instance
const fetch = require('node-fetch');

async function testTinybird() {
    console.log('Testing Tinybird connection...\n');
    
    // Configuration
    const host = process.env.TINYBIRD_HOST || 'http://localhost:7181/v0/events';
    const token = process.env.TINYBIRD_TOKEN || 'p.eyJ1IjogIjkyZjliMTE1LTQ2MzktNDczZC1hMGVjLWVjYjVhNDY4ZjdmZSIsICJpZCI6ICJmODkyN2ZhYy0yODgyLTRmMTMtOGNjMi1jZDYxOTE5MzBkNzEiLCAiaG9zdCI6ICJsb2NhbCJ9.P4BM6n8VxxrWZc7IeuY9FIh1ftzoC0tP5LJdLT_ppyk';
    const datasource = 'analytics_events';
    
    // Create a test event
    const event = {
        timestamp: new Date().toISOString().replace('T', ' ').replace('Z', ''),
        action: 'page_hit',
        version: '1',
        session_id: 'test-session-' + Date.now(),
        payload: {
            site_uuid: 'test-site-' + Date.now(),
            member_uuid: 'test-member-123',
            member_status: 'free',
            post_uuid: 'test-post-456',
            pathname: '/test-page/',
            referrer: 'https://www.google.com/',
            'user-agent': 'Mozilla/5.0 (Test) AppleWebKit/537.36',
            locale: 'en-US',
            location: 'US',
            href: 'https://example.com/test-page/',
            event_id: 'test-event-' + Date.now(),
            meta: {
                referrerSource: 'Google'
            }
        }
    };
    
    console.log('Sending event to Tinybird:');
    console.log('Host:', host);
    console.log('Datasource:', datasource);
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('\n');
    
    try {
        const url = `${host}?name=${datasource}&token=${token}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-site-uuid': event.payload.site_uuid
            },
            body: JSON.stringify(event)
        });
        
        const responseText = await response.text();
        
        if (response.ok) {
            console.log('✅ Success! Event sent to Tinybird');
            console.log('Response status:', response.status);
            console.log('Response:', responseText);
        } else {
            console.error('❌ Failed to send event to Tinybird');
            console.error('Response status:', response.status);
            console.error('Response:', responseText);
        }
    } catch (error) {
        console.error('❌ Error connecting to Tinybird:', error.message);
        console.error('Make sure Tinybird is running locally with: yarn tb');
    }
}

// Load environment variables if .env exists
const fs = require('fs');
const path = require('path');
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

// Run the test
testTinybird().catch(console.error);