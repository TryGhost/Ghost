import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    LocalRevisionsStore,
    MAX_REVISIONS_PER_POST,
    MIN_REVISION_TIME_MS,
    REVISION_PREFIX,
} from "./local-revisions";

/**
 * Minimal in-memory Storage used for the quota-eviction tests, where setItem
 * has to fail deterministically.
 */
class MemoryStorage implements Storage {
    private items = new Map<string, string>();
    failNextSetItems = 0;

    get length(): number {
        return this.items.size;
    }

    key(index: number): string | null {
        return Array.from(this.items.keys())[index] ?? null;
    }

    getItem(key: string): string | null {
        return this.items.has(key) ? (this.items.get(key) as string) : null;
    }

    setItem(key: string, value: string): void {
        if (this.failNextSetItems > 0) {
            this.failNextSetItems -= 1;
            const error = new Error("quota exceeded");
            error.name = "QuotaExceededError";
            throw error;
        }
        this.items.set(key, value);
    }

    removeItem(key: string): void {
        this.items.delete(key);
    }

    clear(): void {
        this.items.clear();
    }
}

describe("LocalRevisionsStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        window.localStorage.clear();
    });

    describe("performSave", () => {
        it("writes the Ember-compatible key and revision shape", () => {
            const store = new LocalRevisionsStore();
            vi.setSystemTime(1700000000000);

            const key = store.performSave("post", {
                id: "post-1",
                title: "My post",
                lexical: '{"root":{}}',
                slug: "my-post",
                status: "draft",
                authors: [{ id: "author-1" }],
                tags: [{ name: "News" }],
            });

            expect(key).toBe(`${REVISION_PREFIX}-post-1-1700000000000`);
            const stored: unknown = JSON.parse(window.localStorage.getItem(key as string) as string);
            expect(stored).toMatchObject({
                id: "post-1",
                type: "post",
                revisionTimestamp: 1700000000000,
                title: "My post",
                lexical: '{"root":{}}',
                slug: "my-post",
                authors: [{ id: "author-1" }],
                tags: [{ name: "News" }],
            });
        });

        it("defaults the id to 'draft' for unsaved posts (same as Ember)", () => {
            const store = new LocalRevisionsStore();
            vi.setSystemTime(42);

            const key = store.performSave("post", { title: "New" });

            expect(key).toBe(`${REVISION_PREFIX}-draft-42`);
        });

        it("keeps only the newest revisions per saved post", () => {
            const store = new LocalRevisionsStore();

            for (let i = 0; i < MAX_REVISIONS_PER_POST + 2; i++) {
                vi.setSystemTime(1000 + i);
                store.performSave("post", { id: "post-1", title: `rev ${i}` });
            }

            const revisions = store.findAll(`${REVISION_PREFIX}-post-1`);
            expect(revisions).toHaveLength(MAX_REVISIONS_PER_POST);
            expect(revisions[0].title).toBe("rev 6");
            expect(revisions.at(-1)?.title).toBe("rev 2");
        });

        it("does not filter unsaved-draft revisions", () => {
            const store = new LocalRevisionsStore();

            for (let i = 0; i < MAX_REVISIONS_PER_POST + 2; i++) {
                vi.setSystemTime(1000 + i);
                store.performSave("post", { title: `rev ${i}` });
            }

            expect(store.findAll(`${REVISION_PREFIX}-draft`)).toHaveLength(MAX_REVISIONS_PER_POST + 2);
        });

        it("evicts the oldest revision and retries when the quota is exceeded", () => {
            const storage = new MemoryStorage();
            const store = new LocalRevisionsStore({ storage });
            vi.setSystemTime(1000);
            store.performSave("post", { id: "old-post", title: "Old" });
            vi.setSystemTime(2000);

            storage.failNextSetItems = 1;
            const key = store.performSave("post", { id: "new-post", title: "New" });

            expect(key).toBe(`${REVISION_PREFIX}-new-post-2000`);
            expect(store.find(`${REVISION_PREFIX}-old-post-1000`)).toBeNull();
            expect(store.find(key as string)).toMatchObject({ title: "New" });
        });

        it("gives up without throwing when the quota is exceeded and nothing can be evicted", () => {
            const storage = new MemoryStorage();
            const store = new LocalRevisionsStore({ storage });

            storage.failNextSetItems = 1;
            const key = store.performSave("post", { id: "post-1", title: "New" });

            expect(key).toBeUndefined();
            expect(storage.length).toBe(0);
        });
    });

    describe("scheduleSave", () => {
        it("saves drafts immediately when outside the throttle window", () => {
            const store = new LocalRevisionsStore();

            store.scheduleSave("post", { id: "post-1", title: "First", status: "draft" });

            expect(store.findAll()).toHaveLength(1);
        });

        it("ignores posts that are not drafts", () => {
            const store = new LocalRevisionsStore();

            store.scheduleSave("post", { id: "post-1", title: "Live", status: "published" });

            expect(store.findAll()).toHaveLength(0);
        });

        it("throttles follow-up saves to one per minute, keeping the latest data", () => {
            const store = new LocalRevisionsStore();

            store.scheduleSave("post", { id: "post-1", title: "First", status: "draft" });
            store.scheduleSave("post", { id: "post-1", title: "Second", status: "draft" });
            store.scheduleSave("post", { id: "post-1", title: "Third", status: "draft" });
            expect(store.findAll()).toHaveLength(1);

            vi.advanceTimersByTime(MIN_REVISION_TIME_MS);

            const revisions = store.findAll();
            expect(revisions).toHaveLength(2);
            expect(revisions[0].title).toBe("Third");
        });

        it("saves immediately again once the throttle window has passed", () => {
            const store = new LocalRevisionsStore();

            store.scheduleSave("post", { id: "post-1", title: "First", status: "draft" });
            vi.advanceTimersByTime(MIN_REVISION_TIME_MS + 1);
            store.scheduleSave("post", { id: "post-1", title: "Second", status: "draft" });

            expect(store.findAll()).toHaveLength(2);
        });

        it("destroy cancels a scheduled save", () => {
            const store = new LocalRevisionsStore();

            store.scheduleSave("post", { id: "post-1", title: "First", status: "draft" });
            store.scheduleSave("post", { id: "post-1", title: "Second", status: "draft" });
            store.destroy();
            vi.advanceTimersByTime(MIN_REVISION_TIME_MS);

            expect(store.findAll()).toHaveLength(1);
        });
    });

    describe("reading", () => {
        it("findAll returns revisions newest first, including their keys", () => {
            const store = new LocalRevisionsStore();
            vi.setSystemTime(1000);
            store.performSave("post", { id: "a", title: "Older" });
            vi.setSystemTime(2000);
            store.performSave("page", { id: "b", title: "Newer" });

            const revisions = store.findAll();

            expect(revisions.map(revision => revision.title)).toEqual(["Newer", "Older"]);
            expect(revisions[0].key).toBe(`${REVISION_PREFIX}-b-2000`);
            expect(revisions[0].type).toBe("page");
        });

        it("reads revisions written by the Ember admin", () => {
            // shape and key produced by ghost/admin/app/services/local-revisions.js
            const emberRevision = {
                id: "ember-post",
                type: "post",
                revisionTimestamp: 1700000000000,
                title: "Written by Ember",
                lexical: '{"root":{}}',
                slug: "written-by-ember",
                status: "draft",
                authors: [{ id: "author-1", name: "Author" }],
                tags: [{ name: "News" }],
            };
            window.localStorage.setItem(
                `${REVISION_PREFIX}-ember-post-1700000000000`,
                JSON.stringify(emberRevision),
            );
            const store = new LocalRevisionsStore();

            const revisions = store.findAll();

            expect(revisions).toHaveLength(1);
            expect(revisions[0]).toMatchObject(emberRevision);
        });

        it("find returns null for missing keys", () => {
            const store = new LocalRevisionsStore();

            expect(store.find("post-revision-nope-1")).toBeNull();
        });

        it("clear removes only revision keys", () => {
            const store = new LocalRevisionsStore();
            store.performSave("post", { id: "post-1", title: "A" });
            window.localStorage.setItem("unrelated-key", "kept");

            store.clear();

            expect(store.findAll()).toHaveLength(0);
            expect(window.localStorage.getItem("unrelated-key")).toBe("kept");
        });
    });
});
