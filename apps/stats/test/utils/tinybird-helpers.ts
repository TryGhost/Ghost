import 'dotenv/config';
import {faker} from '@faker-js/faker';

export const statsConfig = {
    endpoint: process.env.STATS_ENDPOINT,
    token: process.env.STATS_TOKEN,
    id: process.env.STATS_ID,
    local: {
        enabled: true,
        token: process.env.STATS_LOCAL_TOKEN,
        endpoint: process.env.STATS_LOCAL_ENDPOINT,
        datasource: process.env.STATS_LOCAL_DATASOURCE
    }
};

interface AnalyticsEventProps {
    siteUuid: string;
    timestamp?: Date;
    location?: string;
    locale?: string;
    referrer?: string;
    referrerSource?: string;
}

const formatDate = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

function getFormattedDate(daysAgo: number) {
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return formatDate(date);
}

export async function addAnalyticsEvent(eventProps: AnalyticsEventProps) {
    const {siteUuid, locale, location, referrer, referrerSource} = eventProps;

    const {local} = statsConfig;
    const eventsUrl = `${local.endpoint}/v0/events?name=${local.datasource}`;

    const response = await fetch(eventsUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${local.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            timestamp: getFormattedDate(5),
            session_id: faker.string.uuid(),
            action: 'page_hit',
            version: '1',
            payload: {
                site_uuid: siteUuid,
                member_uuid: faker.string.uuid(),
                member_status: 'undefined',
                post_uuid: faker.string.uuid(),
                post_type: 'post',
                'user-agent': faker.internet.userAgent(),
                locale: locale || 'en-GB',
                location: location || 'GB',
                referrer: referrer || 'https://example.com',
                pathname: '/hello-world/',
                href: 'https://my-ghost-site.com/hello-world/',
                meta: {
                    referrerSource: referrerSource || 'https://example.com'
                }
            }
        })
    });

    const bodyText = await response.text();

    if (!response.ok) {
        let errorMessage;

        try {
            const data = JSON.parse(bodyText);
            errorMessage = data.message || JSON.stringify(data);
        } catch (_) {
            errorMessage = bodyText;
        }

        throw new Error(`Request failed (${response.status}): ${errorMessage}`);
    }
}
