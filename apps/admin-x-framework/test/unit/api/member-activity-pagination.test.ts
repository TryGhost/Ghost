import { describe, expect, it, vi } from 'vitest';
import {
  loadMemberActivityPage,
  type MemberActivityCursor,
} from '../../../src/api/member-activity-pagination';
import type { MemberActivityEvent, MemberActivityFeedResponseType } from '../../../src/api/members';

const timestamp = '2026-09-14T10:00:00.000Z';
const olderTimestamp = '2026-09-14T09:59:59.000Z';

function event(
  id: number,
  type = 'email_delivered_event',
  createdAt = timestamp,
  memberId = 'member-1',
): MemberActivityEvent {
  return {
    type,
    data: { id: String(id).padStart(24, '0'), created_at: createdAt, member_id: memberId },
  };
}

const identity = (value: MemberActivityEvent) => `${value.type}:${value.data.id}`;
const serverFilterType = (value: MemberActivityEvent) =>
  value.type === 'email_complaint_event' ? 'email_complained_event' : value.type;

/** A legacy server: only filter+limit, timestamp order, and per-type ID order.
 * Mixed types deliberately use type priority ahead of ID, as Core does. */
function legacyServer(
  source: MemberActivityEvent[],
  { metadata = true, maxLimit = Infinity, textTimestamps = false } = {},
) {
  return vi.fn(
    async ({ filter, limit }: Record<string, string>): Promise<MemberActivityFeedResponseType> => {
      let matching = [...source];
      for (const match of filter.matchAll(/data\.created_at:(<)?'([^']+)'/g)) {
        const cursor = textTimestamps ? match[2] : Date.parse(match[2].replace(' ', 'T') + 'Z');
        matching = matching.filter((value) => {
          // SQLite compares the second-precision text Ghost stores, without
          // converting the filter value to a date as MySQL does.
          const stored = textTimestamps
            ? value.data.created_at!.replace('T', ' ').replace(/\.000Z$/, '')
            : Date.parse(value.data.created_at!);
          return match[1] ? stored < cursor : stored === cursor;
        });
      }
      for (const match of filter.matchAll(/type:-\[([^\]]+)\]/g)) {
        const excluded = match[1].replaceAll("'", '').split(',');
        matching = matching.filter((value) => !excluded.includes(serverFilterType(value)));
      }
      for (const match of filter.matchAll(/type:'([^']+)'/g)) {
        matching = matching.filter((value) => serverFilterType(value) === match[1]);
      }
      for (const match of filter.matchAll(/type:\[([^\]]+)\]/g)) {
        const included = match[1].replaceAll("'", '').split(',');
        matching = matching.filter((value) => included.includes(serverFilterType(value)));
      }
      for (const match of filter.matchAll(/data\.member_id:'([^']+)'/g)) {
        matching = matching.filter((value) => value.data.member_id === match[1]);
      }
      for (const match of filter.matchAll(/(?:^|\+)id:<'([^']+)'/g)) {
        matching = matching.filter((value) => String(value.data.id) < match[1]);
      }
      matching.sort(
        (a, b) =>
          Date.parse(b.data.created_at!) - Date.parse(a.data.created_at!) ||
          a.type.localeCompare(b.type) ||
          String(b.data.id).localeCompare(String(a.data.id)),
      );
      const pageLimit = Math.min(Number(limit), maxLimit);
      return {
        events: matching.slice(0, pageLimit),
        ...(metadata
          ? {
              meta: {
                pagination: {
                  limit: pageLimit,
                  total: matching.length,
                  page: 1,
                  pages: Math.ceil(matching.length / pageLimit),
                  next: null,
                  prev: null,
                },
              },
            }
          : {}),
      };
    },
  );
}

async function browseAll(
  read: ReturnType<typeof legacyServer>,
  options: { limit?: number; filter?: string } = {},
) {
  let cursor: MemberActivityCursor | undefined;
  const events: MemberActivityEvent[] = [];
  for (let pageCount = 0; pageCount < 1000; pageCount++) {
    const page = await loadMemberActivityPage({ read, limit: 50, ...options, cursor });
    expect(page.events.length).toBeLessThanOrEqual(options.limit ?? 50);
    events.push(...page.events);
    cursor = page.nextCursor;
    if (!cursor) {
      return events;
    }
  }
  throw new Error('Pagination failed to finish.');
}

describe('member activity pagination against the legacy endpoint', () => {
  it('returns every event in a large same-second send with bounded requests and no duplicate identities', async () => {
    const source = [
      ...Array.from({ length: 2500 }, (_, index) => event(index + 1)),
      ...Array.from({ length: 60 }, (_, index) =>
        event(index + 2501, 'email_delivered_event', olderTimestamp),
      ),
    ];
    const read = legacyServer(source);
    const result = await browseAll(read);

    expect(result.map(identity)).toEqual(
      [...source]
        .sort(
          (a, b) =>
            Date.parse(b.data.created_at!) - Date.parse(a.data.created_at!) ||
            String(b.data.id).localeCompare(String(a.data.id)),
        )
        .map(identity),
    );
    expect(new Set(result.map(identity)).size).toBe(source.length);
    expect(read.mock.calls.every(([params]) => Number(params.limit) <= 50)).toBe(true);
    expect(Math.max(...read.mock.calls.map(([params]) => params.filter.length))).toBeLessThan(250);
  });

  it('keeps events of different types with the same recipient ID and discovers unknown types', async () => {
    const source = [
      ...Array.from({ length: 80 }, (_, index) => event(index + 1, 'email_delivered_event')),
      ...Array.from({ length: 80 }, (_, index) => event(index + 1, 'email_opened_event')),
      ...Array.from({ length: 70 }, (_, index) => event(index + 1, 'future_server_event')),
      event(900, 'signup_event', olderTimestamp),
    ];
    const result = await browseAll(legacyServer(source), { limit: 7 });

    expect(result.map(identity).sort()).toEqual(source.map(identity).sort());
    expect(result[result.length - 1]).toEqual(source[source.length - 1]);
    expect(new Set(result.map(identity)).size).toBe(source.length);
  });

  it('preserves exclusions and member constraints for every boundary request', async () => {
    const source = [
      ...Array.from({ length: 70 }, (_, index) => event(index + 1)),
      ...Array.from({ length: 70 }, (_, index) => event(index + 1, 'email_opened_event')),
      ...Array.from({ length: 70 }, (_, index) =>
        event(index + 1, 'email_delivered_event', timestamp, 'member-2'),
      ),
    ];
    const filter = "type:-[email_opened_event]+data.member_id:'member-1'";
    const read = legacyServer(source);
    const result = await browseAll(read, { limit: 10, filter });

    expect(result.map(identity).sort()).toEqual(source.slice(0, 70).map(identity).sort());
    expect(read.mock.calls.every(([params]) => params.filter.startsWith(filter))).toBe(true);
  });

  it('drains spam complaints when Core uses a different type name in its filter', async () => {
    const source = [
      ...Array.from({ length: 70 }, (_, index) => event(index + 1, 'email_complaint_event')),
      ...Array.from({ length: 70 }, (_, index) => event(index + 1, 'email_opened_event')),
    ];
    const result = await browseAll(legacyServer(source), { limit: 7 });
    expect(result.map(identity).sort()).toEqual(source.map(identity).sort());
  });

  it('does not require pagination metadata from an older backend', async () => {
    const source = Array.from({ length: 105 }, (_, index) => event(index + 1));
    expect(
      (await browseAll(legacyServer(source, { metadata: false }))).map(identity).sort(),
    ).toEqual(source.map(identity).sort());
  });

  it('continues when a server clamps the requested page size', async () => {
    const source = Array.from({ length: 105 }, (_, index) => event(index + 1));
    expect((await browseAll(legacyServer(source, { maxLimit: 7 }))).map(identity).sort()).toEqual(
      source.map(identity).sort(),
    );
  });

  it.each([1, 75])(
    'paginates SQLite text timestamps with %s events at the boundary',
    async (boundaryCount) => {
      const source = [
        ...Array.from({ length: boundaryCount }, (_, index) => event(index + 1)),
        event(100, 'login_event', olderTimestamp),
      ];
      const result = await browseAll(legacyServer(source, { textTimestamps: true }), {
        limit: Math.min(boundaryCount, 50),
      });

      expect(result.map(identity).sort()).toEqual(source.map(identity).sort());
      expect(result[result.length - 1]).toEqual(source[source.length - 1]);
      expect(new Set(result.map(identity)).size).toBe(source.length);
    },
  );

  it('keeps sub-second timestamp precision across page boundaries', async () => {
    const source = [
      event(3, 'login_event', '2026-09-14T10:00:00.900Z'),
      event(2, 'login_event', '2026-09-14T10:00:00.500Z'),
      event(1, 'login_event', '2026-09-14T10:00:00.100Z'),
      event(0, 'login_event', '2026-09-14T10:00:00.000Z'),
    ];
    expect(await browseAll(legacyServer(source), { limit: 1 })).toEqual(source);
  });

  it('retries a failed boundary request from the unchanged cursor', async () => {
    const source = Array.from({ length: 125 }, (_, index) => event(index + 1));
    const read = legacyServer(source);
    const first = await loadMemberActivityPage({ read, limit: 50 });
    const savedCursor = JSON.stringify(first.nextCursor);
    const reliableRead = read.getMockImplementation()!;
    read.mockImplementationOnce(reliableRead).mockRejectedValueOnce(new Error('Connection lost'));

    await expect(
      loadMemberActivityPage({ read, limit: 50, cursor: first.nextCursor }),
    ).rejects.toThrow('Connection lost');
    expect(JSON.stringify(first.nextCursor)).toBe(savedCursor);
    const second = await loadMemberActivityPage({ read, limit: 50, cursor: first.nextCursor });
    const third = await loadMemberActivityPage({ read, limit: 50, cursor: second.nextCursor });
    expect([...first.events, ...second.events, ...third.events].map(identity).sort()).toEqual(
      source.map(identity).sort(),
    );
  });

  it('stops subsequent boundary requests when a filter change cancels the query', async () => {
    const source = Array.from({ length: 125 }, (_, index) => event(index + 1));
    const read = legacyServer(source);
    const first = await loadMemberActivityPage({ read, limit: 50 });
    const controller = new AbortController();
    const reliableRead = read.getMockImplementation()!;
    read.mockImplementationOnce(async (params) => {
      const response = await reliableRead(params);
      controller.abort();
      return response;
    });
    const beforeCalls = read.mock.calls.length;

    await expect(
      loadMemberActivityPage({
        read,
        limit: 50,
        cursor: first.nextCursor,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(read.mock.calls.length - beforeCalls).toBe(1);
  });

  it('fails visibly instead of ending pagination when a response cannot advance', async () => {
    const read = legacyServer([event(1)]);
    read.mockResolvedValueOnce({
      events: [],
      meta: { pagination: { page: 1, pages: 2, limit: 50, total: 100, next: null, prev: null } },
    });
    await expect(loadMemberActivityPage({ read, limit: 50 })).rejects.toThrow(
      'did not make progress',
    );
  });
});
