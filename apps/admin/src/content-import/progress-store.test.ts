import { createImportProgressStore } from './progress-store';
import type { TrackedImport } from './progress';

const id = 'abcdefabcdefabcdefabcdef';
const otherId = '123456789012345678901234';
const key = 'ghost:csv-imports:/blog/ghost/:staff';
const progress: TrackedImport = {
  import_id: id,
  status: 'running',
  processed: 1,
  total: 10,
  stale: false,
};
let store: ReturnType<typeof createImportProgressStore>;
const disconnects: Array<() => void> = [];
function connect(storageKey = key) {
  const disconnect = store.connect(storageKey);
  disconnects.push(disconnect);
  return disconnect;
}

beforeEach(() => {
  store = createImportProgressStore();
  localStorage.clear();
});
afterEach(() => {
  disconnects.splice(0).forEach((disconnect) => disconnect());
  vi.restoreAllMocks();
  localStorage.clear();
});

it('publishes stable snapshots and only persists IDs, with removable subscriptions', () => {
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  const initial = store.getSnapshot();
  initial.track(id);
  initial.dismiss(id);
  initial.update(progress);
  expect(store.getSnapshot()).toBe(initial);
  connect();
  const { track, update, dismiss } = store.getSnapshot();
  track(id);
  const tracked = store.getSnapshot();
  track(id);
  track('invalid');
  expect(store.getSnapshot()).toBe(tracked);
  update(progress);
  expect(store.getSnapshot().imports).toEqual([progress]);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
  expect(listener).toHaveBeenCalledTimes(3);
  unsubscribe();
  dismiss(id);
  expect(listener).toHaveBeenCalledTimes(3);
  expect(store.getSnapshot().imports).toEqual([]);
  expect(localStorage.getItem(key)).toBeNull();
  update(progress);
  expect(store.getSnapshot().imports).toEqual([]);
});

it('ignores late work and cleanup from a previous session, even for the same user', () => {
  const disconnect = connect();
  const previous = store.getSnapshot();
  previous.track(id);
  const disconnectCurrent = connect();
  const current = store.getSnapshot();
  previous.track(otherId);
  previous.dismiss(id);
  previous.update(progress);
  disconnect();
  expect(store.getSnapshot()).toBe(current);
  expect(current.ids).toEqual([id]);
  expect(current.imports).toEqual([]);
  current.update(progress);
  expect(store.getSnapshot().imports).toEqual([progress]);
  disconnectCurrent();
  current.track(otherId);
  current.dismiss(id);
  current.update(progress);
  expect(store.getSnapshot().imports).toEqual([]);
  expect(store.getSnapshot().ids).toEqual([]);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([id]);
});

it('syncs browser storage and drops removed results without resurrecting stale progress', () => {
  connect();
  const { track, update } = store.getSnapshot();
  track(id);
  track(otherId);
  update(progress);
  const otherProgress = { ...progress, import_id: otherId };
  update(otherProgress);
  window.dispatchEvent(new StorageEvent('storage', { key: 'another-user' }));
  expect(store.getSnapshot().imports).toEqual([progress, otherProgress]);
  localStorage.setItem(key, JSON.stringify([otherId]));
  window.dispatchEvent(new StorageEvent('storage', { key }));
  expect(store.getSnapshot().imports).toEqual([otherProgress]);
  localStorage.setItem(key, JSON.stringify([id, otherId]));
  window.dispatchEvent(new StorageEvent('storage', { key }));
  expect(store.getSnapshot().imports).toEqual([otherProgress]);
  localStorage.clear();
  window.dispatchEvent(new StorageEvent('storage', { key: null }));
  expect(store.getSnapshot().ids).toEqual([]);
  expect(store.getSnapshot().imports).toEqual([]);
});

it('keeps old storage listeners from overwriting the active user', () => {
  connect();
  const otherKey = 'ghost:csv-imports:/blog/ghost/:other';
  connect(otherKey);
  const current = store.getSnapshot();
  localStorage.setItem(key, JSON.stringify([id]));
  window.dispatchEvent(new StorageEvent('storage', { key }));
  expect(store.getSnapshot()).toBe(current);
  expect(current.key).toBe(otherKey);
  expect(current.ids).toEqual([]);
});

it('removes storage listeners on disconnect and retains persisted IDs', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const disconnect = connect();
  store.getSnapshot().track(id);
  disconnect();
  expect(remove).toHaveBeenCalledWith('storage', expect.any(Function));
  window.dispatchEvent(new StorageEvent('storage', { key }));
  expect(store.getSnapshot().ids).toEqual([]);
  connect();
  expect(store.getSnapshot().ids).toEqual([id]);
});

it('keeps tracking in memory when browser storage cannot be used', () => {
  for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error('blocked');
    });
  }
  connect();
  const { track, update, dismiss } = store.getSnapshot();
  track(id);
  update(progress);
  expect(store.getSnapshot().imports).toEqual([progress]);
  dismiss(id);
  expect(store.getSnapshot().imports).toEqual([]);
});
