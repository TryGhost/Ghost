import { escapeNqlString } from '@tryghost/nql-string';
import type { MemberActivityEvent, MemberActivityFeedResponseType } from './members';

type OlderCursor = { kind: 'older'; before?: string };
type BoundaryCursor = {
  kind: 'boundary';
  timestamp: string;
  seen: string[];
  completedTypes: string[];
  currentType?: string;
  beforeId?: string;
};

export type MemberActivityCursor = OlderCursor | BoundaryCursor;
export interface MemberActivityPage extends MemberActivityFeedResponseType {
  nextCursor?: MemberActivityCursor;
}

type ReadEvents = (params: Record<string, string>) => Promise<MemberActivityFeedResponseType>;

const eventKey = (event: MemberActivityEvent) => `${event.type}:${event.data.id}`;

// Older Core filters this source as "complained" but returns "complaint".
// Include both spellings so this also works after the server fixes the alias.
const filterTypes = (type: string): string[] =>
  type === 'email_complaint_event' ? ['email_complaint_event', 'email_complained_event'] : [type];

function eventTimestamp(event: MemberActivityEvent): string {
  const timestamp = event.data.created_at;
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error('Member activity returned an event without a valid timestamp.');
  }
  // SQLite compares Ghost's second-precision timestamps as text. Omit a zero
  // fraction to match those rows, but retain nonzero milliseconds for precision.
  return new Date(timestamp)
    .toISOString()
    .replace('T', ' ')
    .replace(/(?:\.000)?Z$/, '');
}

function validateEvents(events: MemberActivityEvent[]): void {
  for (const event of events) {
    eventTimestamp(event);
    if (typeof event.data.id !== 'string' || !event.data.id || !event.type) {
      throw new Error('Member activity returned an event without a valid identity.');
    }
  }
}

function hasMore(response: MemberActivityFeedResponseType, limit: number): boolean {
  const total = response.meta?.pagination.total;
  // The total also catches a server applying a lower page limit. Never silently
  // treat a clamped response as the end of the feed.
  return typeof total === 'number'
    ? total > response.events.length
    : response.events.length >= limit;
}

/**
 * The older events API has no cursor or offset and merges several event tables.
 * Its same-timestamp ordering is not globally ID-ordered, so adding id < lastId
 * to the merged feed would still skip events. Complete its final timestamp one
 * event type at a time, where the server's ID-descending order is unambiguous.
 * Discover types through the API instead of maintaining a second event catalog.
 *
 * Requests and returned pages stay bounded by limit. Cursor memory is bounded
 * by one page's initial boundary identities and the number of event types,
 * regardless of the size of a newsletter send. Shared recipient IDs belonging
 * to distinct email event types remain distinct events.
 */
export async function loadMemberActivityPage({
  read,
  filter = '',
  limit,
  cursor = { kind: 'older' },
  signal,
}: {
  read: ReadEvents;
  filter?: string;
  limit: number;
  cursor?: MemberActivityCursor;
  signal?: AbortSignal;
}): Promise<MemberActivityPage> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Member activity page size must be a positive integer.');
  }
  // A failed request must leave the previous page's cursor untouched so a retry
  // starts from exactly the same position.
  let state: MemberActivityCursor =
    cursor.kind === 'boundary'
      ? { ...cursor, seen: [...cursor.seen], completedTypes: [...cursor.completedTypes] }
      : { ...cursor };
  const events: MemberActivityEvent[] = [];

  const request = async (parts: string[], requestLimit: number) => {
    signal?.throwIfAborted();
    const response = await read({
      // Core requires event-type constraints at the root AND level. Wrapping
      // the base filter in parentheses would make mixed type/member filters fail.
      filter: [filter, ...parts].filter(Boolean).join('+'),
      limit: String(requestLimit),
    });
    // useFetchApi owns the in-flight network request. Stop any following drain
    // requests when React Query cancels this query after navigation/filtering.
    signal?.throwIfAborted();
    validateEvents(response.events);
    if (
      response.events.length > requestLimit ||
      (!response.events.length && hasMore(response, requestLimit))
    ) {
      throw new Error('Member activity pagination did not make progress.');
    }
    return response;
  };

  while (events.length < limit) {
    const remaining = limit - events.length;
    if (state.kind === 'older') {
      const before = state.before;
      const response = await request(
        before ? [`data.created_at:<${escapeNqlString(before)}`] : [],
        remaining,
      );
      if (before && response.events.some((event) => eventTimestamp(event) >= before)) {
        throw new Error('Member activity returned events outside the requested time range.');
      }
      events.push(...response.events);
      if (!hasMore(response, remaining)) {
        return { events, meta: response.meta };
      }
      const timestamp = eventTimestamp(response.events[response.events.length - 1]);
      state = {
        kind: 'boundary',
        timestamp,
        seen: response.events.filter((event) => eventTimestamp(event) === timestamp).map(eventKey),
        completedTypes: [],
      };
      if (events.length === limit) {
        return { events, meta: response.meta, nextCursor: state };
      }
      continue;
    }

    const timestampFilter = `data.created_at:${escapeNqlString(state.timestamp)}`;
    if (!state.currentType) {
      const typeFilter = state.completedTypes.length
        ? [`type:-[${state.completedTypes.flatMap(filterTypes).map(escapeNqlString).join(',')}]`]
        : [];
      const discovery = await request([timestampFilter, ...typeFilter], 1);
      const event = discovery.events[0];
      if (
        !event ||
        (!state.completedTypes.length && discovery.meta?.pagination.total === state.seen.length)
      ) {
        state = { kind: 'older', before: state.timestamp };
        continue;
      }
      if (eventTimestamp(event) !== state.timestamp || state.completedTypes.includes(event.type)) {
        throw new Error('Member activity returned events outside the requested type or timestamp.');
      }
      state.currentType = event.type;
    }

    const beforeId = state.beforeId;
    const currentType = state.currentType;
    const timestamp = state.timestamp;
    const response = await request(
      [
        timestampFilter,
        `type:[${filterTypes(currentType).map(escapeNqlString).join(',')}]`,
        ...(beforeId ? [`id:<${escapeNqlString(beforeId)}`] : []),
      ],
      remaining,
    );
    if (
      response.events.some(
        (event) =>
          event.type !== currentType ||
          eventTimestamp(event) !== timestamp ||
          (beforeId && String(event.data.id) >= beforeId),
      )
    ) {
      throw new Error('Member activity returned events outside the requested cursor.');
    }
    const seen = new Set(state.seen);
    events.push(...response.events.filter((event) => !seen.has(eventKey(event))));

    if (hasMore(response, remaining)) {
      // The single-type response is ID-descending. Use the minimum defensively
      // so the cursor advances even if an older server returns a shuffled page.
      state.beforeId = response.events.map((event) => String(event.data.id)).sort()[0];
    } else {
      state.completedTypes.push(state.currentType);
      state.currentType = undefined;
      state.beforeId = undefined;
    }
  }

  return { events, nextCursor: state };
}
