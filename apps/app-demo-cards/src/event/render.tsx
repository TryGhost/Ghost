import renderToString from 'preact-render-to-string';
import type { CardRenderer } from '@tryghost/app-sdk/cards';

import { text } from '../shared.ts';

export interface EventDetails {
  title: string;
  startsAt: string;
  location: string;
  description: string;
  url: string;
}

export function readEvent(properties: Record<string, unknown>): EventDetails {
  return {
    title: text(properties, 'title', 'Event title'),
    startsAt: text(properties, 'startsAt'),
    location: text(properties, 'location'),
    description: text(properties, 'description', 'Tell readers what the event is about.'),
    url: text(properties, 'url'),
  };
}

export function formatStart(startsAt: string, timezone: string) {
  const start = /(?:Z|[+-]\d{2}:\d{2})$/i.test(startsAt) ? new Date(startsAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { date: 'Date to be announced', time: '' };
  }
  try {
    return {
      date: new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: timezone,
      }).format(start),
      time: `${new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(start)}`,
    };
  } catch {
    return formatStart(startsAt, 'UTC');
  }
}

function EventCard({ event, timezone }: { event: EventDetails; timezone: string }) {
  const start = formatStart(event.startsAt, timezone);
  return (
    <article className="event-card">
      <p className="event-card__eyebrow">Event</p>
      <h2>{event.title}</h2>
      <p className="event-card__time">
        <time dateTime={event.startsAt}>
          {start.date}
          {start.time ? ` · ${start.time}` : ''}
        </time>
      </p>
      {event.description && <p className="event-card__description">{event.description}</p>}
      {(event.location || event.url) && (
        <footer>
          {event.location && <p className="event-card__location">{event.location}</p>}
          {event.url && (
            <a href={event.url}>
              Register <span aria-hidden="true">→</span>
            </a>
          )}
        </footer>
      )}
    </article>
  );
}

function EmailEventCard({ event, timezone }: { event: EventDetails; timezone: string }) {
  const start = formatStart(event.startsAt, timezone);
  return (
    <table
      role="presentation"
      width="100%"
      style={{
        borderCollapse: 'collapse',
        borderTop: '2px solid #1d1d1b',
        borderBottom: '1px solid #c9c9c5',
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '20px 0 22px', color: '#1d1d1b' }}>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: '#5b5b56',
              }}
            >
              Event
            </p>
            <h2
              style={{
                margin: '0 0 10px',
                fontSize: '26px',
                fontWeight: '700',
                lineHeight: '1.15',
                letterSpacing: '-.01em',
              }}
            >
              {event.title}
            </h2>
            <p style={{ margin: '0', fontSize: '15px', fontWeight: '700', lineHeight: '1.5' }}>
              {start.date}
              {start.time ? ` · ${start.time}` : ''}
            </p>
            {event.description && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: '16px',
                  lineHeight: '1.55',
                  color: '#3d3d39',
                }}
              >
                {event.description}
              </p>
            )}
            {event.location && (
              <p style={{ margin: '14px 0 0', fontSize: '14px', color: '#5b5b56' }}>
                {event.location}
              </p>
            )}
            {event.url && (
              <p style={{ margin: '14px 0 0' }}>
                <a
                  href={event.url}
                  style={{
                    color: '#1d1d1b',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'underline',
                  }}
                >
                  Register →
                </a>
              </p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

const css = `
.event-card { box-sizing: border-box; padding: 22px 0 24px; border-top: 2px solid #1d1d1b; border-bottom: 1px solid #c9c9c5; color: #1d1d1b; }
.event-card__eyebrow { margin: 0 0 12px; color: #5b5b56; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.event-card h2 { max-width: 26ch; margin: 0 0 10px; font-size: clamp(24px, 4.5vw, 32px); font-weight: 700; letter-spacing: -.015em; line-height: 1.12; }
.event-card__time { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.5; }
.event-card__description { max-width: 62ch; margin: 12px 0 0; color: #3d3d39; font-size: 16px; line-height: 1.55; }
.event-card footer { display: flex; align-items: baseline; justify-content: space-between; gap: 12px 24px; margin-top: 16px; }
.event-card__location { margin: 0; color: #5b5b56; font-size: 14px; line-height: 1.5; }
.event-card a { flex: none; color: inherit; font-size: 14px; font-weight: 700; text-decoration-thickness: 1px; text-underline-offset: 3px; }
@media (max-width: 420px) { .event-card footer { display: block; } .event-card a { display: inline-block; margin-top: 10px; } }
`;

export const renderEvent: CardRenderer = ({ properties, site }) => {
  const event = readEvent(properties);
  const timezone = site.timezone || 'UTC';
  return {
    html: renderToString(<EventCard event={event} timezone={timezone} />),
    css,
    height: 300,
    email_html: renderToString(<EmailEventCard event={event} timezone={timezone} />),
  };
};
