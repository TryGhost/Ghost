import { useCallback, useSyncExternalStore } from 'react';

/**
 * POC storage (poc/segments-ui). What the segments API and the staff preferences don't hold yet
 * is kept in this browser's localStorage, so the screens can be tried without a schema change:
 *
 * - which segments are pinned to the sidebar, which would be a field on the segment
 * - whether the sidebar shows every pinned segment or only the first few, which would be one of
 *   the staff user's navigation preferences
 * - which segments pretend to be in use, standing in for the posts and automations that will
 *   refer to one
 * - whether the site pretends to have no segments at all, to look at the empty states
 *
 * Every hook here is the shape a real field would be read through, so swapping the storage
 * leaves the screens as they are.
 */

const PINS_KEY = 'ghost-poc:segment-pins';
const SIMULATED_USAGE_KEY = 'ghost-poc:segment-simulated-usage';

const listeners = new Set<() => void>();
const cache = new Map<string, readonly string[]>();

function read(key: string): readonly string[] {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  let ids: string[] = [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    if (Array.isArray(parsed)) {
      ids = parsed.filter((id): id is string => typeof id === 'string');
    }
  } catch {
    // Storage that can't be read holds nothing.
  }
  cache.set(key, ids);
  return ids;
}

function write(key: string, ids: readonly string[]) {
  cache.set(key, ids);
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Kept for this page load only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useIdSet(key: string) {
  const ids = useSyncExternalStore(subscribe, () => read(key));
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const set = useCallback(
    (id: string, on: boolean) => {
      const others = read(key).filter((other) => other !== id);
      write(key, on ? [...others, id] : others);
    },
    [key],
  );

  return { has, set };
}

/** Which segments show as shortcuts under Members in the sidebar. None do until pinned. */
export function useSegmentPins() {
  const { has, set } = useIdSet(PINS_KEY);
  return { isPinned: has, setPinned: set };
}

const SIDEBAR_SHOWS_ALL_PINS_KEY = 'ghost-poc:sidebar-shows-all-pins';

/**
 * Whether the sidebar shows every pinned segment. It shows only the first few until asked for
 * the rest, so pinning many can't push the rest of the sidebar out of view.
 */
export function useSidebarShowsAllPins() {
  const { has, set } = useIdSet(SIDEBAR_SHOWS_ALL_PINS_KEY);
  const setShowsAllPins = useCallback((on: boolean) => set('on', on), [set]);

  return { showsAllPins: has('on'), setShowsAllPins };
}

const BUILDER_FILTER_FIRST_KEY = 'ghost-poc:builder-filter-first';

/**
 * Whether the segment builder asks for the filters first, and the name only once they match
 * someone, instead of the name first. Off by default, for the two to be compared.
 */
export function useBuilderFilterFirst() {
  const { has, set } = useIdSet(BUILDER_FILTER_FIRST_KEY);
  const setFilterFirst = useCallback((on: boolean) => set('on', on), [set]);

  return { filterFirst: has('on'), setFilterFirst };
}

const SIMULATE_NO_SEGMENTS_KEY = 'ghost-poc:simulate-no-segments';

/**
 * Whether the site is shown as if it had no segments, to look at the empty states. The segments
 * are still there, and anything saved meanwhile is too: it shows once this is off again.
 */
export function useSimulateNoSegments() {
  const { has, set } = useIdSet(SIMULATE_NO_SEGMENTS_KEY);
  const setSimulateNoSegments = useCallback((on: boolean) => set('on', on), [set]);

  return { simulateNoSegments: has('on'), setSimulateNoSegments };
}

/** What refers to a segment: the automations it starts and the scheduled posts emailed to it. */
export interface SegmentUsage {
  automations: ReadonlyArray<{ name: string }>;
  scheduledPosts: ReadonlyArray<{ title: string; sendsIn: string }>;
}

const NO_USAGE: SegmentUsage = { automations: [], scheduledPosts: [] };

// Sample data. Nothing on main refers to a segment yet.
const SAMPLE_USAGE: SegmentUsage = {
  automations: [{ name: 'Win-back sequence' }],
  scheduledPosts: [{ title: 'December members letter', sendsIn: 'in 3 days' }],
};

export const isInUse = (usage: SegmentUsage) =>
  usage.automations.length + usage.scheduledPosts.length > 0;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** What uses a segment, in a few words: "1 scheduled post and 1 automation". */
export function usageSummary(usage: SegmentUsage): string | null {
  if (!isInUse(usage)) {
    return null;
  }

  return [
    usage.scheduledPosts.length > 0 &&
      plural(usage.scheduledPosts.length, 'scheduled post', 'scheduled posts'),
    usage.automations.length > 0 && plural(usage.automations.length, 'automation', 'automations'),
  ]
    .filter(Boolean)
    .join(' and ');
}

/**
 * What refers to each segment. A segment is used by nothing until it is switched to "simulate
 * usage" from its menu, when it reports the sample above.
 */
export function useSegmentUsage() {
  const { has, set } = useIdSet(SIMULATED_USAGE_KEY);
  const usageOf = useCallback((id: string) => (has(id) ? SAMPLE_USAGE : NO_USAGE), [has]);

  return { usageOf, isSimulated: has, setSimulated: set };
}
