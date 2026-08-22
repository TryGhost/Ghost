import {defineEditorBlockRenderer} from '@tryghost/addon-kit/editor';
import type {AddonEditorBlockRequest} from '@tryghost/addon-kit/editor';

type EventDetails = {
    title: string;
    startsAt: string;
    timezone: string;
    location: string;
    description: string;
    url: string;
};

function stringProperty(props: Record<string, unknown>, name: string, fallback = '') {
    return typeof props[name] === 'string' ? props[name] : fallback;
}

function eventDetails(props: Record<string, unknown>, siteTimezone: string): EventDetails {
    return {
        title: stringProperty(props, 'title', 'Untitled event'),
        startsAt: stringProperty(props, 'startsAt'),
        timezone: siteTimezone,
        location: stringProperty(props, 'location'),
        description: stringProperty(props, 'description'),
        url: stringProperty(props, 'url')
    };
}

function formatStart(startsAt: string, timezone: string) {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(startsAt)) {
        return {date: 'Date to be announced', time: '', timezone};
    }

    const start = new Date(startsAt);

    if (Number.isNaN(start.getTime())) {
        return {date: 'Date to be announced', time: '', timezone};
    }

    try {
        return {
            date: new Intl.DateTimeFormat('en', {
                day: 'numeric',
                month: 'long',
                timeZone: timezone,
                year: 'numeric'
            }).format(start),
            time: new Intl.DateTimeFormat('en', {
                hour: '2-digit',
                hourCycle: 'h23',
                minute: '2-digit',
                timeZone: timezone
            }).format(start),
            timezone
        };
    } catch {
        return formatStart(startsAt, 'UTC');
    }
}

function EventCard({event}: {event: EventDetails}) {
    const start = formatStart(event.startsAt, event.timezone);

    return (
        <article className="event-card">
            <p className="event-card__eyebrow">Upcoming event</p>
            <h2>{event.title}</h2>
            <p className="event-card__time">
                <time dateTime={event.startsAt}>{start.date}{start.time ? ` · ${start.time}` : ''}</time>
                <span> {start.timezone}</span>
            </p>
            {event.location && <p className="event-card__location">{event.location}</p>}
            {event.description && <p>{event.description}</p>}
            {event.url && <p><a href={event.url}>View event details</a></p>}
        </article>
    );
}

function PortableEventCard({event}: {event: EventDetails}) {
    const start = formatStart(event.startsAt, event.timezone);

    return (
        <article style={{background: '#f8f7ff', border: '1px solid #d9d7ef', borderRadius: '18px', color: '#241e3b', fontFamily: 'Arial, sans-serif', padding: '28px'}}>
            <p style={{color: '#6554c0', fontSize: '12px', fontWeight: '700', letterSpacing: '.08em', margin: '0', textTransform: 'uppercase'}}>Upcoming event</p>
            <h2 style={{fontSize: '25px', lineHeight: '1.25', margin: '10px 0'}}>{event.title}</h2>
            <p style={{fontWeight: '700', lineHeight: '1.5', margin: '0'}}>
                <time dateTime={event.startsAt}>{start.date}{start.time ? ` · ${start.time}` : ''}</time>
                <span style={{color: '#675f7d'}}> {start.timezone}</span>
            </p>
            {event.location && <p style={{color: '#675f7d', lineHeight: '1.5', margin: '8px 0 0'}}>{event.location}</p>}
            {event.description && <p style={{lineHeight: '1.5', margin: '14px 0 0'}}>{event.description}</p>}
            {event.url && <a href={event.url} style={{background: '#5541b5', borderRadius: '999px', color: '#ffffff', display: 'inline-block', fontWeight: '700', marginTop: '18px', padding: '10px 16px', textDecoration: 'none'}}>View event details</a>}
        </article>
    );
}

function renderEvent({blockName, props, context}: AddonEditorBlockRequest) {
    if (blockName !== 'event') {
        throw new Error(`Unknown editor block: ${blockName}`);
    }

    const event = eventDetails(props, context?.siteTimezone || 'UTC');

    return {
        content: <EventCard event={event} />,
        portableContent: <PortableEventCard event={event} />,
        css: `
            .event-card {
                box-sizing: border-box;
                min-height: 280px;
                padding: 32px;
                border: 1px solid #d9d7ef;
                border-radius: 18px;
                background: linear-gradient(135deg, #f5f3ff, #ffffff 68%);
                box-shadow: 0 12px 30px rgba(50, 42, 91, .08);
                color: #241e3b;
                font-family: ui-sans-serif, system-ui, sans-serif;
            }
            .event-card__eyebrow {
                margin: 0;
                color: #6554c0;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: .08em;
                text-transform: uppercase;
            }
            .event-card h2 { margin: 12px 0 10px; font-size: 26px; }
            .event-card p { margin: 10px 0 0; line-height: 1.5; }
            .event-card__time { font-weight: 650; }
            .event-card__time span, .event-card__location { color: #675f7d; }
            .event-card a { display:inline-block;margin-top:8px;padding:9px 14px;border-radius:999px;background:#5541b5;color:#fff;font-weight:700;text-decoration:none; }
        `,
        initialHeight: 310
    };
}

export default defineEditorBlockRenderer(renderEvent);
