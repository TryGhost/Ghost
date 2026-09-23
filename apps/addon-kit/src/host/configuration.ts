import type { AddonInstallRecord } from '../types.ts';

export interface AddonInstallStore {
  read(): Promise<AddonInstallRecord[]>;
  write(records: AddonInstallRecord[]): Promise<void>;
}

/** Configuration belongs to an install, never to a provider manifest. */
export async function saveAddonConfiguration(
  handle: string,
  configuration: Record<string, unknown>,
  store: AddonInstallStore,
): Promise<void> {
  if (
    !configuration ||
    typeof configuration !== 'object' ||
    Array.isArray(configuration) ||
    JSON.stringify(configuration).length > 100_000
  ) {
    throw new Error('Invalid app configuration');
  }
  const snapshot = structuredClone(configuration);
  await mutateAddonInstallRecords(store, (records) => {
    if (!records.some((record) => record.handle === handle)) {
      throw new Error('Install the app before saving configuration');
    }
    return records.map((record) =>
      record.handle === handle ? { ...record, configuration: snapshot } : record,
    );
  });
}

// All add-on setting writers in this host share one queue. Read only after the
// previous write has finished; a failed write must not block later changes.
let pendingWrite: Promise<void> = Promise.resolve();
export function mutateAddonInstallRecords(
  store: AddonInstallStore,
  update: (records: AddonInstallRecord[]) => AddonInstallRecord[],
): Promise<void> {
  const work = pendingWrite.then(async () => {
    const records = await store.read();
    await store.write(update(records));
  });
  pendingWrite = work.catch(() => {});
  return work;
}
