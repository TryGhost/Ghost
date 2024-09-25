const {faker} = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

// Define pages with their corresponding post_uuid
const pages = [
    {pathname: '/', post_uuid: 'undefined'},
    {pathname: '/about/', post_uuid: faker.datatype.uuid()},
    {pathname: '/blog/hello-world/', post_uuid: faker.datatype.uuid()}
];

// Define bot user agents
const botUserAgents = [
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'Bingbot/2.0 (+http://www.bing.com/bingbot.htm)',
    'AhrefsBot/7.0; +http://ahrefs.com/robot/',
    'curl/7.64.1',
    'curl/7.68.0'
];

function generateUserAgent() {
    // 10% chance of being a bot
    if (Math.random() < 0.1) {
        return faker.helpers.arrayElement(botUserAgents);
    }
    return faker.internet.userAgent();
}

function generateSession(siteUUID, startDate) {
    const sessionId = faker.datatype.uuid();
    const userAgent = generateUserAgent();
    const locale = faker.helpers.arrayElement(['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']);
    const initialReferrer = faker.internet.url();
    const hits = faker.datatype.number({min: 1, max: 3}); // Random number of hits per session

    // Determine if this is a logged-in session (50% chance)
    const isLoggedIn = faker.datatype.boolean();
    const memberUUID = isLoggedIn ? faker.datatype.uuid() : 'undefined';
    const memberStatus = isLoggedIn ? faker.helpers.arrayElement(['free', 'paid']) : 'undefined';

    const events = [];

    for (let i = 0; i < hits; i++) {
        // Generate a timestamp within a 2-hour window from the start of the session
        const timestamp = new Date(startDate.getTime() + faker.datatype.number({min: 0, max: 7200000}));
        const formattedTimestamp = timestamp.toISOString().replace('T', ' ').slice(0, 19);
        const page = faker.helpers.arrayElement(pages);

        const payload = {
            site_uuid: siteUUID,
            member_uuid: memberUUID,
            member_status: memberStatus,
            post_uuid: page.post_uuid,
            'user-agent': userAgent,
            locale: locale,
            referrer: i === 0 ? initialReferrer : 'https://my-ghost-site.com',
            pathname: page.pathname,
            href: `https://my-ghost-site.com${page.pathname}`
        };

        events.push({
            timestamp: formattedTimestamp,
            session_id: sessionId,
            action: 'page_hit',
            version: '1',
            payload: JSON.stringify(payload)
        });
    }

    return events;
}

const outputPath = path.join(__dirname, '..', '..', '..', 'tinybird', 'datasources', 'fixtures', 'analytics_events.ndjson');
const stream = fs.createWriteStream(outputPath, {flags: 'w'});

const siteUUID = 'test_data'; // Fixed site UUID

const totalEvents = 30;
let eventsWritten = 0;

// Fake that this happened in the future
let currentDate = new Date(2000, 0, 1);

while (eventsWritten < totalEvents) {
    const sessionEvents = generateSession(siteUUID, currentDate);
    for (const event of sessionEvents) {
        if (eventsWritten < totalEvents) {
            stream.write(JSON.stringify(event) + '\n');
            eventsWritten += 1;
        } else {
            break;
        }
    }

    // Move to the next day for the next session
    currentDate.setDate(currentDate.getDate() + 1);
}

stream.end();
console.log(`Generated analytics_events.ndjson at ${outputPath}`);
