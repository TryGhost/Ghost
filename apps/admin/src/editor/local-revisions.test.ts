import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalRevisionWriter,
  readLocalRevisions,
  writeLocalRevision,
  type LocalRevision,
  type LocalRevisionDraft,
  type StoredLocalRevision,
} from '@/editor/local-revisions';

/** An in-memory Storage that refuses writes past `capacity` characters, as a full browser store does. */
class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();
  private readonly capacity: number;

  constructor(capacity = Infinity) {
    this.capacity = capacity;
  }

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const used = [...this.entries].reduce(
      (total, [k, v]) => (k === key ? total : total + k.length + v.length),
      0,
    );
    if (used + key.length + value.length > this.capacity) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }
}

const FIELDS = {
  title: 'Hello',
  slug: 'hello',
  status: 'draft',
  lexical: '{"root":{"children":[]}}',
  authors: [{ id: 'user-1' }],
  tags: [{ id: 'tag-1', name: 'News', slug: 'news' }],
};

function revision(overrides: Partial<LocalRevision> = {}): LocalRevision {
  return { id: 'post-1', type: 'post', revisionTimestamp: 1000, ...FIELDS, ...overrides };
}

function draft(overrides: Partial<LocalRevisionDraft> = {}): LocalRevisionDraft {
  return { id: 'post-1', ...FIELDS, ...overrides };
}

describe('writeLocalRevision', () => {
  it('stores the revision as JSON under its post id and timestamp', () => {
    const storage = new MemoryStorage();
    const onError = vi.fn();

    const key = writeLocalRevision(storage, revision(), onError);

    expect(key).toBe('post-revision-post-1-1000');
    expect(JSON.parse(storage.getItem('post-revision-post-1-1000') ?? '')).toEqual(revision());
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the newest five revisions of a post and leaves other posts alone', () => {
    const storage = new MemoryStorage();
    writeLocalRevision(storage, revision({ id: 'post-2', revisionTimestamp: 1 }), vi.fn());
    for (let timestamp = 1; timestamp <= 6; timestamp += 1) {
      writeLocalRevision(storage, revision({ revisionTimestamp: timestamp }), vi.fn());
    }

    expect(storage.keys().sort()).toEqual([
      'post-revision-post-1-2',
      'post-revision-post-1-3',
      'post-revision-post-1-4',
      'post-revision-post-1-5',
      'post-revision-post-1-6',
      'post-revision-post-2-1',
    ]);
  });

  it('never trims revisions of a post that has not been created', () => {
    const storage = new MemoryStorage();
    for (let timestamp = 1; timestamp <= 7; timestamp += 1) {
      writeLocalRevision(storage, revision({ id: 'draft', revisionTimestamp: timestamp }), vi.fn());
    }

    expect(storage.length).toBe(7);
  });

  it('gives up the oldest revisions, of any post, until a write fits', () => {
    const entry = (id: string, timestamp: number) =>
      revision({ id, revisionTimestamp: timestamp, lexical: 'x'.repeat(400) });
    const size = (value: LocalRevision) =>
      `post-revision-${value.id}-${value.revisionTimestamp}`.length + JSON.stringify(value).length;
    const storage = new MemoryStorage(size(entry('post-2', 1)) * 3 + 10);
    const onError = vi.fn();
    writeLocalRevision(storage, entry('post-2', 1), onError);
    writeLocalRevision(storage, entry('post-3', 2), onError);
    writeLocalRevision(storage, entry('post-1', 3), onError);

    const key = writeLocalRevision(storage, entry('post-1', 4), onError);

    expect(key).toBe('post-revision-post-1-4');
    expect(storage.keys().sort()).toEqual([
      'post-revision-post-1-3',
      'post-revision-post-1-4',
      'post-revision-post-3-2',
    ]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      tags: { localRevisions: 'quotaExceeded' },
    });
  });

  it('evicts by the time in the key, and a key without one first', () => {
    const value = revision({ lexical: 'x'.repeat(200) });
    const size = `post-revision-post-1-1000`.length + JSON.stringify(value).length;
    const storage = new MemoryStorage(size * 2 + 10);
    writeLocalRevision(
      storage,
      revision({ id: 'post-2', revisionTimestamp: 1, lexical: 'x'.repeat(200) }),
      vi.fn(),
    );
    storage.setItem('post-revision-post-9-x', 'not json'.padEnd(size - 25, '!'));

    writeLocalRevision(storage, value, vi.fn());

    expect(storage.getItem('post-revision-post-9-x')).toBeNull();
    expect(storage.getItem('post-revision-post-2-1')).not.toBeNull();
    expect(storage.getItem('post-revision-post-1-1000')).not.toBeNull();
  });

  it('keeps a revision a skewed clock stamped older than the ones already kept', () => {
    const storage = new MemoryStorage();
    for (let timestamp = 10; timestamp <= 14; timestamp += 1) {
      writeLocalRevision(storage, revision({ revisionTimestamp: timestamp }), vi.fn());
    }

    writeLocalRevision(storage, revision({ revisionTimestamp: 1 }), vi.fn());

    expect(storage.keys().sort()).toEqual([
      'post-revision-post-1-1',
      'post-revision-post-1-11',
      'post-revision-post-1-12',
      'post-revision-post-1-13',
      'post-revision-post-1-14',
    ]);
  });

  it('reports a revision that cannot fit even in an empty store', () => {
    const storage = new MemoryStorage(10);
    const onError = vi.fn();

    expect(writeLocalRevision(storage, revision(), onError)).toBeUndefined();

    expect(storage.length).toBe(0);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), {
      tags: { localRevisions: 'quotaExceededNoSpace' },
    });
  });

  it('reports any other storage failure instead of throwing', () => {
    const storage = new MemoryStorage();
    const failure = new Error('storage is broken');
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw failure;
    });
    const onError = vi.fn();

    expect(writeLocalRevision(storage, revision(), onError)).toBeUndefined();

    expect(onError).toHaveBeenCalledWith(failure, { tags: { localRevisions: 'saveError' } });
  });
});

describe('readLocalRevisions', () => {
  it('lists every revision newest first, with the key it is stored under', () => {
    const storage = new MemoryStorage();
    writeLocalRevision(storage, revision({ revisionTimestamp: 1 }), vi.fn());
    writeLocalRevision(storage, revision({ id: 'post-2', revisionTimestamp: 3 }), vi.fn());
    writeLocalRevision(storage, revision({ revisionTimestamp: 2 }), vi.fn());

    expect(readLocalRevisions(storage).map(({ key }) => key)).toEqual([
      'post-revision-post-2-3',
      'post-revision-post-1-2',
      'post-revision-post-1-1',
    ]);
    expect(readLocalRevisions(storage)[0]).toMatchObject({ id: 'post-2', title: 'Hello' });
  });

  it('keeps every field of an entry that carries more than the editor writes', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'post-revision-post-1-5',
      JSON.stringify({
        ...revision({ revisionTimestamp: 5 }),
        authors: [{ id: 'user-1', name: 'Jo', email: 'jo@example.com' }],
        meta_title: 'Meta',
      }),
    );

    expect(readLocalRevisions(storage)).toEqual([
      expect.objectContaining({
        key: 'post-revision-post-1-5',
        authors: [{ id: 'user-1', name: 'Jo', email: 'jo@example.com' }],
        meta_title: 'Meta',
      }),
    ]);
  });

  it('skips entries it cannot read and keys that are not revisions', () => {
    const storage = new MemoryStorage();
    storage.setItem('post-revision-post-1-1', 'not json');
    storage.setItem('post-revision-post-1-2', JSON.stringify(['a list']));
    storage.setItem('post-revision-post-1-3', JSON.stringify({ title: 'No timestamp' }));
    storage.setItem('ghost-last-published-post', JSON.stringify(revision()));
    writeLocalRevision(storage, revision({ revisionTimestamp: 4 }), vi.fn());

    expect(readLocalRevisions(storage).map(({ key }) => key)).toEqual(['post-revision-post-1-4']);
  });
});

describe('createLocalRevisionWriter', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00.000Z'));
    storage = new MemoryStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function writer(type: 'post' | 'page' = 'post') {
    return createLocalRevisionWriter({ type, storage: () => storage, onError: vi.fn() });
  }

  function stored(): StoredLocalRevision[] {
    return readLocalRevisions(storage);
  }

  it('starts nothing until something is recorded', () => {
    writer();

    expect(vi.getTimerCount()).toBe(0);
    expect(storage.length).toBe(0);
  });

  it('writes the first draft at once, stamped with its type and time', () => {
    writer('page').record(draft({ title: 'First' }));

    expect(stored()).toEqual([
      expect.objectContaining({
        id: 'post-1',
        type: 'page',
        title: 'First',
        revisionTimestamp: Date.parse('2026-09-29T10:00:00.000Z'),
      }),
    ]);
  });

  it('stores a post that has not been created under the draft id', () => {
    writer().record(draft({ id: null }));

    expect(stored()[0].key).toBe(`post-revision-draft-${Date.now()}`);
  });

  it('collapses the drafts of the following minute into one write of the newest', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'First' }));

    vi.advanceTimersByTime(10_000);
    revisions.record(draft({ title: 'Second' }));
    vi.advanceTimersByTime(10_000);
    revisions.record(draft({ title: 'Third' }));

    expect(stored().map(({ title }) => title)).toEqual(['First']);

    vi.advanceTimersByTime(40_000);

    expect(stored().map(({ title }) => title)).toEqual(['Third', 'First']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('writes at once again after a quiet minute', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'First' }));

    vi.advanceTimersByTime(60_000);
    revisions.record(draft({ title: 'Second' }));

    expect(stored().map(({ title }) => title)).toEqual(['Second', 'First']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushes the given draft now and drops the one waiting for the minute', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'First' }));
    vi.advanceTimersByTime(1_000);
    revisions.record(draft({ title: 'Waiting' }));

    revisions.flush(draft({ title: 'Latest' }));
    vi.advanceTimersByTime(60_000);

    expect(stored().map(({ title }) => title)).toEqual(['Latest', 'First']);
  });

  it('discards the draft waiting for the minute', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'First' }));
    vi.advanceTimersByTime(1_000);
    revisions.record(draft({ title: 'Waiting' }));

    revisions.discard();
    vi.advanceTimersByTime(60_000);

    expect(stored().map(({ title }) => title)).toEqual(['First']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips a draft identical to the last copy written', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'Same' }));

    vi.advanceTimersByTime(1_000);
    revisions.record(draft({ title: 'Same' }));
    vi.advanceTimersByTime(60_000);
    revisions.flush(draft({ title: 'Same' }));

    expect(stored().map(({ title }) => title)).toEqual(['Same']);
  });

  it('keeps at most five copies of a post it has not created, leaving other sessions alone', () => {
    storage.setItem(
      'post-revision-draft-1',
      JSON.stringify(revision({ id: 'draft', revisionTimestamp: 1 })),
    );
    const revisions = writer();

    for (let index = 1; index <= 7; index += 1) {
      revisions.record(draft({ id: null, title: `Take ${index}` }));
      vi.advanceTimersByTime(60_000);
    }

    expect(stored().map(({ title }) => title)).toEqual([
      'Take 7',
      'Take 6',
      'Take 5',
      'Take 4',
      'Take 3',
      'Hello',
    ]);
  });

  it('removes its copies of a post that has not been created once it is', () => {
    storage.setItem(
      'post-revision-draft-1',
      JSON.stringify(revision({ id: 'draft', revisionTimestamp: 1 })),
    );
    const revisions = writer();
    revisions.record(draft({ id: null, title: 'Before the create' }));
    vi.advanceTimersByTime(60_000);
    revisions.record(draft({ id: null, title: 'Still before the create' }));

    revisions.created();
    vi.advanceTimersByTime(60_000);
    revisions.record(draft({ id: 'post-1', title: 'After the create' }));

    expect(
      stored().map(({ key, title }) => [key.split('-').slice(2, -1).join('-'), title]),
    ).toEqual([
      ['post-1', 'After the create'],
      ['draft', 'Hello'],
    ]);
  });

  it('writes at once when the clock has moved backwards', () => {
    const revisions = writer();
    revisions.record(draft({ title: 'First' }));

    vi.setSystemTime(new Date('2026-09-29T09:00:00.000Z'));
    revisions.record(draft({ title: 'Second' }));

    expect(stored().map(({ title }) => title)).toEqual(['First', 'Second']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports storage that cannot be reached once instead of throwing', () => {
    const onError = vi.fn();
    const failure = new DOMException('Access is denied.', 'SecurityError');
    const revisions = createLocalRevisionWriter({
      type: 'post',
      storage: () => {
        throw failure;
      },
      onError,
    });

    revisions.record(draft({ title: 'First' }));
    vi.advanceTimersByTime(60_000);
    revisions.record(draft({ title: 'Second' }));
    revisions.flush(draft({ title: 'Third' }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure, { tags: { localRevisions: 'saveError' } });
  });
});
