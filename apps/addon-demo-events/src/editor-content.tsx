import { defineEditorBlockRenderer } from '@tryghost/addon-kit/editor';
import type { AddonEditorBlockRequest } from '@tryghost/addon-kit/editor';

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
    url: stringProperty(props, 'url'),
  };
}

function formatStart(startsAt: string, timezone: string) {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(startsAt)) {
    return { date: 'Date to be announced', time: '', timezone };
  }

  const start = new Date(startsAt);

  if (Number.isNaN(start.getTime())) {
    return { date: 'Date to be announced', time: '', timezone };
  }

  try {
    return {
      date: new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'long',
        timeZone: timezone,
        year: 'numeric',
      }).format(start),
      time: new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        timeZone: timezone,
      }).format(start),
      timezone,
    };
  } catch {
    return formatStart(startsAt, 'UTC');
  }
}

function EventCard({ event }: { event: EventDetails }) {
  const start = formatStart(event.startsAt, event.timezone);

  return (
    <article className="event-card">
      <p className="event-card__eyebrow">Event</p>
      <h2>{event.title}</h2>
      <p className="event-card__time">
        <time dateTime={event.startsAt}>
          {start.date}
          {start.time ? ` · ${start.time}` : ''}
        </time>
        <span>· {start.timezone}</span>
      </p>
      {event.description && <p>{event.description}</p>}
      {(event.location || event.url) && (
        <footer>
          {event.location && <p className="event-card__location">{event.location}</p>}
          {event.url && (
            <a href={event.url}>
              Event details <span aria-hidden="true">→</span>
            </a>
          )}
        </footer>
      )}
    </article>
  );
}

function PortableEventCard({ event }: { event: EventDetails }) {
  const start = formatStart(event.startsAt, event.timezone);

  return (
    <article
      style={{
        borderBottom: '1px solid #b9b9b5',
        borderTop: '1px solid #b9b9b5',
        color: '#181816',
        padding: '22px 0 24px',
      }}
    >
      <p
        style={{
          color: '#6f6f6b',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '.12em',
          margin: '0 0 14px',
          textTransform: 'uppercase',
        }}
      >
        Event
      </p>
      <h2
        style={{
          fontSize: '28px',
          fontWeight: '400',
          letterSpacing: '-.015em',
          lineHeight: '1.15',
          margin: '0 0 12px',
        }}
      >
        {event.title}
      </h2>
      <p style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.5', margin: '0' }}>
        <time dateTime={event.startsAt}>
          {start.date}
          {start.time ? ` · ${start.time}` : ''}
        </time>
        <span style={{ color: '#6f6f6b', fontWeight: '400' }}> · {start.timezone}</span>
      </p>
      {event.description && (
        <p style={{ color: '#3f3f3c', fontSize: '16px', lineHeight: '1.55', margin: '16px 0 0' }}>
          {event.description}
        </p>
      )}
      {event.location && (
        <p style={{ color: '#6f6f6b', fontSize: '14px', lineHeight: '1.5', margin: '18px 0 0' }}>
          {event.location}
        </p>
      )}
      {event.url && (
        <a
          href={event.url}
          style={{
            color: '#181816',
            display: 'inline-block',
            fontSize: '14px',
            fontWeight: '700',
            marginTop: '12px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Event details →
        </a>
      )}
    </article>
  );
}

function renderEvent({ blockName, props, context }: AddonEditorBlockRequest) {
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
                padding: 24px 2px 26px;
                border-block: 1px solid #c9c9c5;
                background: transparent;
                color: #181816;
            }
            .event-card__eyebrow {
                margin: 0 0 14px;
                color: #6f6f6b;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: .12em;
                text-transform: uppercase;
            }
            .event-card h2 {
                max-width: 22ch;
                margin: 0 0 12px;
                font-size: clamp(28px, 5vw, 38px);
                font-weight: 400;
                letter-spacing: -.025em;
                line-height: 1.08;
            }
            .event-card > p:not(.event-card__eyebrow, .event-card__time) {
                max-width: 62ch;
                margin: 16px 0 0;
                color: #3f3f3c;
                font-size: 16px;
                line-height: 1.55;
            }
            .event-card__time {
                display: flex;
                flex-wrap: wrap;
                gap: 0 6px;
                margin: 0;
                font-size: 14px;
                font-weight: 700;
                line-height: 1.5;
            }
            .event-card__time span { color: #6f6f6b; font-weight: 400; }
            .event-card footer {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 12px 24px;
                margin-top: 20px;
            }
            .event-card__location {
                margin: 0;
                color: #6f6f6b;
                font-size: 14px;
                line-height: 1.5;
            }
            .event-card a {
                flex: none;
                color: inherit;
                font-size: 14px;
                font-weight: 700;
                text-decoration-line: underline;
                text-decoration-thickness: 1px;
                text-underline-offset: 3px;
            }
            @media (max-width: 420px) {
                .event-card footer { display: block; }
                .event-card a { display: inline-block; margin-top: 12px; }
            }
        `,
    initialHeight: 310,
  };
}

export default defineEditorBlockRenderer(renderEvent);
