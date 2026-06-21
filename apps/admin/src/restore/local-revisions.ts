const REVISION_KEY_PREFIX = "post-revision-";

export type LocalRevision = {
    key: string;
    id?: unknown;
    type?: unknown;
    revisionTimestamp?: unknown;
    title?: unknown;
    excerpt?: unknown;
    slug?: unknown;
    status?: unknown;
    authors?: unknown;
    tags?: unknown;
    lexical?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRevisionTimestamp(revision: LocalRevision): number {
    return typeof revision.revisionTimestamp === "number" ? revision.revisionTimestamp : 0;
}

export function keys(storage: Storage = window.localStorage): string[] {
    const revisionKeys: string[] = [];

    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);

        if (key?.startsWith(REVISION_KEY_PREFIX)) {
            revisionKeys.push(key);
        }
    }

    return revisionKeys;
}

export function find(key: string, storage: Storage = window.localStorage): LocalRevision | null {
    let revision: unknown;

    try {
        revision = JSON.parse(storage.getItem(key) || "null");
    } catch {
        return null;
    }

    if (!isRecord(revision)) {
        return null;
    }

    return {
        key,
        ...revision
    };
}

export function findAll(storage: Storage = window.localStorage): LocalRevision[] {
    return keys(storage)
        .map(key => find(key, storage))
        .filter(revision => revision !== null)
        .sort((a, b) => getRevisionTimestamp(b) - getRevisionTimestamp(a));
}
