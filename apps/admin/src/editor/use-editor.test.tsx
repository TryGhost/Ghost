import { StrictMode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
    AddEditorPostPayload,
    EditEditorPostPayload,
    EditorResourceResponseType,
    FullPost,
} from "@tryghost/admin-x-framework/api/editor";
import type { GenerateSlugPayload } from "@tryghost/admin-x-framework/api/slugs";
import { AUTOSAVE_DELAY, TIMED_SAVE_INTERVAL, type PostSnapshot } from "./state";
import { LocalRevisionsStore, MIN_REVISION_TIME_MS } from "./local-revisions";
import { BLANK_LEXICAL, createNewPostSnapshot, toSnapshot, useEditor } from "./use-editor";

const mocks = vi.hoisted(() => ({
    addPost: vi.fn<(payload: AddEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    editPost: vi.fn<(payload: EditEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    generateSlug: vi.fn<(payload: GenerateSlugPayload) => Promise<string>>(),
}));

vi.mock("@tryghost/admin-x-framework/api/editor", () => ({
    useAddEditorPost: () => ({ mutateAsync: mocks.addPost }),
    useEditEditorPost: () => ({ mutateAsync: mocks.editPost }),
}));

vi.mock("@tryghost/admin-x-framework/api/slugs", () => ({
    useGenerateSlug: () => ({ generateSlug: mocks.generateSlug }),
}));

function lexicalDoc(text: string): string {
    return JSON.stringify({
        root: {
            children: [{ children: [{ text, type: "text" }], direction: null, type: "paragraph", version: 1 }],
            direction: null,
            type: "root",
            version: 1,
        },
    });
}

function makeFullPost(overrides: Partial<FullPost> = {}): FullPost {
    return {
        id: "post-1",
        uuid: "uuid-1",
        title: "My post",
        slug: "my-post",
        lexical: lexicalDoc("hello"),
        mobiledoc: null,
        status: "draft",
        visibility: "public",
        custom_excerpt: null,
        feature_image: null,
        feature_image_alt: null,
        feature_image_caption: null,
        featured: false,
        published_at: null,
        updated_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        custom_template: null,
        canonical_url: null,
        codeinjection_head: null,
        codeinjection_foot: null,
        og_image: null,
        og_title: null,
        og_description: null,
        twitter_image: null,
        twitter_title: null,
        twitter_description: null,
        meta_title: null,
        meta_description: null,
        tags: [],
        ...overrides,
    };
}

function makeSnapshot(overrides: Partial<PostSnapshot> = {}): PostSnapshot {
    return { ...toSnapshot(makeFullPost()), ...overrides };
}

// PSM settings fields every save body carries unconditionally
const DEFAULT_BODY_SETTINGS = {
    featured: false,
    custom_template: null,
    canonical_url: null,
    meta_title: null,
    meta_description: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    codeinjection_head: null,
    codeinjection_foot: null,
};

async function flushSaves() {
    // let the mutateAsync promise chain settle
    await act(async () => {
        await Promise.resolve();
    });
}

describe("useEditor", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.localStorage.clear();
        mocks.addPost.mockReset();
        mocks.editPost.mockReset();
        mocks.generateSlug.mockReset();
        mocks.generateSlug.mockResolvedValue("");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setup(options: Parameters<typeof useEditor>[0] = { resource: "posts" }, { strictMode = false } = {}) {
        return renderHook(() => useEditor(options), strictMode ? { wrapper: StrictMode } : {});
    }

    it("starts with no post and loads a snapshot", () => {
        const { result } = setup();
        expect(result.current.state.post).toBeNull();

        act(() => result.current.loadPost(makeSnapshot()));

        expect(result.current.state.post?.id).toBe("post-1");
        expect(result.current.state.titleScratch).toBe("My post");
        expect(result.current.isDirty).toBe(false);
    });

    it("autosaves an existing draft 3s after the last body edit", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ lexical: lexicalDoc("edited"), updated_at: "2026-01-02T00:00:00.000Z" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateLexical(lexicalDoc("edited")));
        expect(mocks.editPost).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1);
        });
        expect(mocks.editPost).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost).toHaveBeenCalledWith({
            id: "post-1",
            resource: "posts",
            post: {
                title: "My post",
                lexical: lexicalDoc("edited"),
                custom_excerpt: null,
                status: "draft",
                published_at: null,
                feature_image: null,
                tags: [],
                slug: "my-post",
                updated_at: "2026-01-01T00:00:00.000Z",
                ...DEFAULT_BODY_SETTINGS,
                visibility: "public",
                tiers: [],
            },
        });

        await flushSaves();
        expect(result.current.state.save.status).toBe("idle");
        expect(result.current.state.post?.updatedAt).toBe("2026-01-02T00:00:00.000Z");
        expect(result.current.isDirty).toBe(false);
    });

    it("restarts the autosave debounce on every body edit", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost()] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateLexical(lexicalDoc("one")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1000);
        });
        act(() => result.current.updateLexical(lexicalDoc("two")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1000);
        });
        expect(mocks.editPost).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
    });

    it("forces a timed save after 60s of continuous typing", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost()] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        // type every 2s so the 3s debounce never fires
        let elapsed = 0;
        let i = 0;
        while (elapsed < TIMED_SAVE_INTERVAL) {
            act(() => result.current.updateLexical(lexicalDoc(`typing ${i += 1}`)));
            await act(async () => {
                await vi.advanceTimersByTimeAsync(2000);
            });
            elapsed += 2000;
        }

        expect(mocks.editPost).toHaveBeenCalledTimes(1);
    });

    it("creates a new post immediately on the first body edit and reports it", async () => {
        const created = makeFullPost({ id: "new-id", slug: "untitled", title: "(Untitled)" });
        mocks.addPost.mockResolvedValue({ posts: [created] });
        const onPostCreated = vi.fn();
        const { result } = setup({ resource: "posts", onPostCreated });

        act(() => result.current.loadPost(createNewPostSnapshot()));
        act(() => result.current.updateLexical(lexicalDoc("first words")));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(mocks.addPost).toHaveBeenCalledTimes(1);
        // an empty slug is omitted so the server generates one on create
        expect(mocks.addPost).toHaveBeenCalledWith({
            resource: "posts",
            post: {
                title: "(Untitled)",
                lexical: lexicalDoc("first words"),
                custom_excerpt: null,
                status: "draft",
                published_at: null,
                feature_image: null,
                tags: [],
                ...DEFAULT_BODY_SETTINGS,
            },
        });
        expect(mocks.editPost).not.toHaveBeenCalled();

        await flushSaves();
        expect(onPostCreated).toHaveBeenCalledWith(created);
        expect(result.current.state.post?.id).toBe("new-id");
    });

    it("creates a new post immediately when only the title changes (regression: title typing must trigger the create)", async () => {
        const created = makeFullPost({ id: "new-id", title: "Just a title", lexical: BLANK_LEXICAL });
        mocks.addPost.mockResolvedValue({ posts: [created] });
        const onPostCreated = vi.fn();
        const { result } = setup({ resource: "posts", onPostCreated });

        act(() => result.current.loadPost(createNewPostSnapshot()));
        act(() => result.current.updateTitle("Just a title"));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(mocks.addPost).toHaveBeenCalledTimes(1);
        expect(mocks.addPost.mock.calls[0][0].post).toMatchObject({ title: "Just a title", status: "draft" });
        expect(mocks.editPost).not.toHaveBeenCalled();

        await flushSaves();
        expect(onPostCreated).toHaveBeenCalledWith(created);
        expect(result.current.state.post?.id).toBe("new-id");
    });

    it("performs the title-triggered create exactly once under StrictMode double-rendering", async () => {
        const created = makeFullPost({ id: "new-id", title: "Just a title", lexical: BLANK_LEXICAL });
        mocks.addPost.mockResolvedValue({ posts: [created] });
        const { result } = setup({ resource: "posts" }, { strictMode: true });

        act(() => result.current.loadPost(createNewPostSnapshot()));
        act(() => result.current.updateTitle("Just a title"));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL * 2);
        });
        await flushSaves();

        expect(mocks.addPost).toHaveBeenCalledTimes(1);
        expect(result.current.state.post?.id).toBe("new-id");
    });

    it("does not create a post when only whitespace is typed in the title", async () => {
        const { result } = setup();
        act(() => result.current.loadPost(createNewPostSnapshot()));
        act(() => result.current.updateTitle("   "));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL * 2);
        });

        expect(mocks.addPost).not.toHaveBeenCalled();
        expect(mocks.editPost).not.toHaveBeenCalled();
    });

    it("does not autosave title edits to an existing post (titles save on blur instead)", async () => {
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));
        act(() => result.current.updateTitle("Renamed without blur"));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL * 2);
        });

        expect(mocks.editPost).not.toHaveBeenCalled();
        expect(result.current.isDirty).toBe(true);
    });

    it("uses the latest snapshot's updated_at for follow-up saves", async () => {
        mocks.editPost
            .mockResolvedValueOnce({ posts: [makeFullPost({ updated_at: "2026-02-02T00:00:00.000Z" })] })
            .mockResolvedValueOnce({ posts: [makeFullPost({ updated_at: "2026-03-03T00:00:00.000Z" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateLexical(lexicalDoc("edit one")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
        });
        await flushSaves();

        act(() => result.current.updateLexical(lexicalDoc("edit two")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
        });
        await flushSaves();

        expect(mocks.editPost).toHaveBeenCalledTimes(2);
        expect(mocks.editPost.mock.calls[1][0].post.updated_at).toBe("2026-02-02T00:00:00.000Z");
    });

    it("resolves performManualSave only after a queued manual save drains (regression: 'Updated' showed before queued edits persisted)", async () => {
        // first save (e.g. a settings field's blur-save) is slow; a second
        // manual save with newer scratch gets queued behind it
        let releaseFirstSave: (value: unknown) => void = () => {};
        let releaseSecondSave: (value: unknown) => void = () => {};
        mocks.editPost
            .mockImplementationOnce(() => new Promise((resolve) => {
                releaseFirstSave = () => resolve({ posts: [makeFullPost({ updated_at: "2026-01-02T00:00:00.000Z" })] });
            }))
            .mockImplementationOnce(() => new Promise((resolve) => {
                releaseSecondSave = () => resolve({ posts: [makeFullPost({ custom_excerpt: "queued excerpt", updated_at: "2026-01-03T00:00:00.000Z" })] });
            }));

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        // save #1 in flight
        let firstSave: Promise<unknown> = Promise.resolve();
        act(() => {
            firstSave = result.current.performManualSave();
        });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);

        // edit + manual save while #1 is in flight → queued
        let secondSave: Promise<unknown> = Promise.resolve();
        act(() => {
            result.current.dispatch({ type: "SCRATCH_CHANGED", field: "customExcerpt", value: "queued excerpt" });
            secondSave = result.current.performManualSave();
        });

        let settled = false;
        void secondSave.then(() => {
            settled = true;
        });

        await act(async () => {
            releaseFirstSave(null);
            await Promise.resolve();
        });
        // the queued save is now running — the manual-save promise must not
        // have settled yet, its changes are not persisted
        expect(settled).toBe(false);
        expect(mocks.editPost).toHaveBeenCalledTimes(2);
        expect(mocks.editPost.mock.calls[1][0].post.custom_excerpt).toBe("queued excerpt");

        await act(async () => {
            releaseSecondSave(null);
            await secondSave;
        });
        expect(settled).toBe(true);
        expect(result.current.state.save.status).toBe("idle");
        // firstSave's deferred was superseded by the second performManualSave
        // call and never settles — matching Ember, where a save re-request
        // while one is queued collapses into the queued task
        void firstSave;
    });

    it("keeps email extras on the publish save even when a plain manual save queues after it", async () => {
        let releaseFirst: () => void = () => {};
        mocks.editPost
            .mockImplementationOnce(() => new Promise((resolve) => {
                releaseFirst = () => resolve({ posts: [makeFullPost({ updated_at: "2026-01-02T00:00:00.000Z" })] });
            }))
            .mockImplementationOnce(() => Promise.resolve({
                posts: [makeFullPost({ status: "published", updated_at: "2026-01-03T00:00:00.000Z" })],
            }));

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        // a plain save (e.g. a settings blur) is in flight
        act(() => {
            void result.current.performManualSave();
        });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);

        // the publish flow queues a publish+email save behind it...
        let publishSave: Promise<unknown> = Promise.resolve();
        act(() => {
            publishSave = result.current.performManualSave({
                saveType: "publish",
                emailOnly: false,
                newsletter: "weekly",
                emailSegment: "status:free",
            });
        });
        // ...and another plain manual save queues after the publish — it must
        // not strip the publish intent or its email extras
        act(() => {
            void result.current.performManualSave();
        });

        await act(async () => {
            releaseFirst();
            await publishSave;
        });

        expect(mocks.editPost).toHaveBeenCalledTimes(2);
        const merged = mocks.editPost.mock.calls[1][0];
        expect(merged.newsletter).toBe("weekly");
        expect(merged.emailSegment).toBe("status:free");
        expect(merged.post.status).toBe("published");
        expect(merged.post.email_only).toBe(false);
    });

    it("publishes a past-scheduled post on a plain manual save (pastScheduledTime computed at dispatch)", async () => {
        mocks.editPost.mockResolvedValue({
            posts: [makeFullPost({ status: "published", published_at: "2020-01-01T10:00:00.000Z" })],
        });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ status: "scheduled", publishedAt: "2020-01-01T10:00:00.000Z" })));

        await act(async () => {
            await result.current.performManualSave();
        });

        expect(mocks.editPost.mock.calls[0][0].post.status).toBe("published");
        expect(result.current.state.post?.status).toBe("published");
    });

    it("publishes a past-scheduled post on a settings-style raw SAVE_REQUESTED dispatch", async () => {
        mocks.editPost.mockResolvedValue({
            posts: [makeFullPost({ status: "published", published_at: "2020-01-01T10:00:00.000Z" })],
        });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ status: "scheduled", publishedAt: "2020-01-01T10:00:00.000Z" })));

        act(() => result.current.dispatch({ type: "SAVE_REQUESTED", kind: "manual" }));
        await flushSaves();

        expect(mocks.editPost.mock.calls[0][0].post.status).toBe("published");
    });

    it("rescheduling a past-scheduled post to a future date keeps it scheduled", async () => {
        mocks.editPost.mockResolvedValue({
            posts: [makeFullPost({ status: "scheduled", published_at: "2050-01-01T10:00:00.000Z" })],
        });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ status: "scheduled", publishedAt: "2020-01-01T10:00:00.000Z" })));

        await act(async () => {
            await result.current.performManualSave({ saveType: "schedule", publishedAt: "2050-01-01T10:00:00.000Z" });
        });

        expect(mocks.editPost.mock.calls[0][0].post).toMatchObject({
            status: "scheduled",
            published_at: "2050-01-01T10:00:00.000Z",
        });
    });

    it("does not revert a publish date edited again while the failing save was in flight", async () => {
        let rejectSave: (error: Error) => void = () => {};
        mocks.editPost.mockImplementationOnce(() => new Promise((_resolve, reject) => {
            rejectSave = reject;
        }));

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        let failingSave: Promise<unknown> = Promise.resolve();
        act(() => {
            failingSave = result.current.performManualSave({
                saveType: "schedule",
                publishedAt: "2050-01-01T10:00:00.000Z",
            });
            failingSave.catch(() => {});
        });

        // the user edits the date again while the save is in flight
        act(() => result.current.dispatch({ type: "SCRATCH_CHANGED", field: "publishedAt", value: "2051-06-06T10:00:00.000Z" }));

        await act(async () => {
            rejectSave(new Error("boom"));
            await failingSave.catch(() => {});
        });

        // the newer edit survives the failure revert
        expect(result.current.state.publishedAtScratch).toBe("2051-06-06T10:00:00.000Z");
        expect(result.current.state.save.status).toBe("error");
    });

    // Audit regression: the editor creates new posts from the first title
    // keystrokes, so the create-save races ahead with a partial title and the
    // server derives the slug from it ("Au..." -> slug "au"). Every draft save
    // with a changed title must re-generate the slug from the title it
    // persists (Ember beforeSaveTask), so the slug converges onto the full
    // title instead of staying stuck at the partial one.
    it("re-generates the slug from the full title when the create-save raced ahead with a partial one", async () => {
        const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        mocks.generateSlug.mockImplementation(({ text }) => Promise.resolve(slugify(text)));

        let releaseCreate: () => void = () => {};
        mocks.addPost.mockImplementationOnce(() => new Promise((resolve) => {
            releaseCreate = () => resolve({ posts: [makeFullPost({ id: "new-id", title: "Au", slug: "au" })] });
        }));
        mocks.editPost.mockResolvedValue({
            posts: [makeFullPost({ id: "new-id", title: "Audit probe", slug: "audit-probe" })],
        });

        const { result } = setup();
        act(() => result.current.loadPost(createNewPostSnapshot()));

        // first keystrokes -> 0ms autosave creates the post from the partial title
        act(() => result.current.updateTitle("Au"));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(mocks.addPost).toHaveBeenCalledTimes(1);
        expect(mocks.addPost.mock.calls[0][0].post).toMatchObject({ title: "Au", slug: "au" });

        // the user finishes the title while the create is still in flight;
        // the follow-up autosave queues behind it
        act(() => result.current.updateTitle("Audit probe"));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        await act(async () => {
            releaseCreate();
            await Promise.resolve();
        });
        await flushSaves();
        await flushSaves();

        // the queued save re-slugs from the full title
        expect(mocks.generateSlug).toHaveBeenLastCalledWith({ type: "post", text: "Audit probe", modelId: "new-id" });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post).toMatchObject({ title: "Audit probe", slug: "audit-probe" });
        expect(result.current.state.post?.slug).toBe("audit-probe");
    });

    it("treats a server-incremented slug as title-derived and keeps regenerating it", async () => {
        // the partial-title save collided with an existing slug, so the
        // server returned "aud-3" — the next title change must still re-slug
        mocks.generateSlug.mockResolvedValue("audit-probe");
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ title: "Audit probe", slug: "audit-probe" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ title: "Aud", slug: "aud-3" })));

        act(() => result.current.updateTitle("Audit probe"));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        expect(mocks.generateSlug).toHaveBeenCalledWith({ type: "post", text: "Audit probe", modelId: "post-1" });
        expect(mocks.editPost.mock.calls[0][0].post.slug).toBe("audit-probe");
    });

    it("slug regeneration follows the title across successive draft saves", async () => {
        const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        mocks.generateSlug.mockImplementation(({ text }) => Promise.resolve(slugify(text)));
        mocks.editPost
            .mockResolvedValueOnce({ posts: [makeFullPost({ title: "Title one", slug: "title-one", updated_at: "2026-01-02T00:00:00.000Z" })] })
            .mockResolvedValueOnce({ posts: [makeFullPost({ title: "Title two", slug: "title-two", updated_at: "2026-01-03T00:00:00.000Z" })] });

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateTitle("Title one"));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        act(() => result.current.updateTitle("Title two"));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        const sentSlugs = mocks.editPost.mock.calls.map(call => call[0].post.slug);
        expect(sentSlugs).toEqual(["title-one", "title-two"]);
        expect(result.current.state.slugScratch).toBe("title-two");
    });

    it("updateSlug marks the editor dirty immediately so navigation can't slip past the async sanitize", async () => {
        let resolveSlug: (slug: string) => void = () => {};
        mocks.generateSlug.mockImplementationOnce(() => new Promise((resolve) => {
            resolveSlug = resolve;
        }));
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ slug: "typed-slug" })] });

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        let updatePromise: Promise<void> = Promise.resolve();
        act(() => {
            updatePromise = result.current.updateSlug("Typed Slug");
        });

        // the typed candidate is in the machine scratch while the server
        // sanitize is pending — the leave guard sees a dirty draft
        expect(result.current.state.slugScratch).toBe("Typed Slug");
        expect(result.current.isDirty).toBe(true);
        expect(result.current.leaveDecision.shouldSaveOnLeave).toBe(true);

        await act(async () => {
            resolveSlug("typed-slug");
            await updatePromise;
        });
        await flushSaves();

        expect(result.current.state.slugScratch).toBe("typed-slug");
        expect(mocks.editPost.mock.calls[0][0].post.slug).toBe("typed-slug");
    });

    it("updateSlug resets the scratch when the sanitize fails or is a no-op", async () => {
        mocks.generateSlug.mockRejectedValueOnce(new Error("offline"));

        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        await act(async () => {
            await result.current.updateSlug("Typed Slug");
        });

        expect(result.current.state.slugScratch).toBe("my-post");
        expect(result.current.isDirty).toBe(false);
        expect(mocks.editPost).not.toHaveBeenCalled();
    });

    it("moves to the error state when the save fails and stays dirty", async () => {
        mocks.editPost.mockRejectedValue(new Error("boom"));
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateLexical(lexicalDoc("edited")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
        });
        await flushSaves();

        expect(result.current.state.save).toMatchObject({
            status: "error",
            error: { type: "generic", message: "boom" },
        });
        expect(result.current.isDirty).toBe(true);
    });

    it("saveTitle regenerates the slug and saves a renamed draft", async () => {
        mocks.generateSlug.mockResolvedValue("new-title");
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ title: "New title", slug: "new-title" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateTitle("New title"));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        expect(mocks.generateSlug).toHaveBeenCalledWith({ type: "post", text: "New title", modelId: "post-1" });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post).toMatchObject({ title: "New title", slug: "new-title" });
    });

    it("clearing the title saves '(Untitled)' but keeps the existing slug (untitled slugs are set once)", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ title: "(Untitled)" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateTitle(""));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        expect(mocks.generateSlug).not.toHaveBeenCalled();
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post).toMatchObject({ title: "(Untitled)", slug: "my-post" });
    });

    it("saveTitle keeps a customized slug", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ title: "New title", slug: "my-custom-slug" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ slug: "my-custom-slug" })));

        act(() => result.current.updateTitle("New title"));
        act(() => result.current.saveTitle());
        await flushSaves();
        await flushSaves();

        expect(mocks.generateSlug).not.toHaveBeenCalled();
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post.slug).toBe("my-custom-slug");
    });

    it("updateSlug cleans the slug via the server and persists it with a manual save", async () => {
        mocks.generateSlug.mockResolvedValue("custom-slug");
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ slug: "custom-slug" })] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        await act(async () => {
            await result.current.updateSlug("Custom Slug!");
        });
        await flushSaves();

        expect(mocks.generateSlug).toHaveBeenCalledWith({ type: "post", text: "Custom Slug!", modelId: "post-1" });
        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post.slug).toBe("custom-slug");
        expect(result.current.state.slugScratch).toBe("custom-slug");
    });

    it("updateSlug is a no-op for unchanged or empty slugs", async () => {
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        await act(async () => {
            await result.current.updateSlug("my-post");
            await result.current.updateSlug("   ");
        });

        expect(mocks.generateSlug).not.toHaveBeenCalled();
        expect(mocks.editPost).not.toHaveBeenCalled();
        expect(result.current.state.slugScratch).toBe("my-post");
    });

    it("updateSlug keeps the existing slug when the server only appended a uniqueness incrementor", async () => {
        mocks.generateSlug.mockResolvedValue("my-post-2");
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        await act(async () => {
            await result.current.updateSlug("my post");
        });

        expect(mocks.editPost).not.toHaveBeenCalled();
        expect(result.current.state.slugScratch).toBe("my-post");
    });

    it("updateSlug defers the save for new unsaved posts", async () => {
        mocks.generateSlug.mockResolvedValue("early-slug");
        const { result } = setup();
        act(() => result.current.loadPost(createNewPostSnapshot()));

        await act(async () => {
            await result.current.updateSlug("early slug");
        });

        expect(result.current.state.slugScratch).toBe("early-slug");
        expect(mocks.addPost).not.toHaveBeenCalled();
        expect(mocks.editPost).not.toHaveBeenCalled();
    });

    it("saveTitle is a no-op when the title did not change", async () => {
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.saveTitle());
        await flushSaves();

        expect(mocks.editPost).not.toHaveBeenCalled();
    });

    it("does not autosave published posts on body edits", async () => {
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ status: "published" })));

        act(() => result.current.updateLexical(lexicalDoc("edited")));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL * 2);
        });

        expect(mocks.editPost).not.toHaveBeenCalled();
        expect(result.current.isDirty).toBe(true);
    });

    it("leave saves keep drafts as drafts and bypass the dirty check", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost()] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.requestSave("leave"));
        await flushSaves();

        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost.mock.calls[0][0].post.status).toBe("draft");
        expect(result.current.state.saveOnLeavePerformed).toBe(true);
    });

    it("clears pending timers on unmount", async () => {
        const { result, unmount } = setup();
        act(() => result.current.loadPost(makeSnapshot()));
        act(() => result.current.updateLexical(lexicalDoc("edited")));

        unmount();
        await vi.advanceTimersByTimeAsync(TIMED_SAVE_INTERVAL * 2);

        expect(mocks.editPost).not.toHaveBeenCalled();
    });

    it("scratch change schedules a local revision (throttled)", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost()] });
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot()));

        act(() => result.current.updateLexical(lexicalDoc("rev one")));

        // the first edit writes a crash-recovery revision immediately, using
        // the Ember-compatible schema
        let revisions = new LocalRevisionsStore().findAll();
        expect(revisions).toHaveLength(1);
        expect(revisions[0].id).toBe("post-1");
        expect(revisions[0].type).toBe("post");
        expect(revisions[0].title).toBe("My post");
        expect(revisions[0].lexical).toBe(lexicalDoc("rev one"));

        // follow-up edits inside the 1-minute window are coalesced into one
        // delayed revision carrying the latest scratch data
        act(() => result.current.updateLexical(lexicalDoc("rev two")));
        act(() => result.current.updateTitle("New title"));
        expect(new LocalRevisionsStore().findAll()).toHaveLength(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(MIN_REVISION_TIME_MS);
        });

        revisions = new LocalRevisionsStore().findAll();
        expect(revisions).toHaveLength(2);
        expect(revisions[0].title).toBe("New title");
        expect(revisions[0].lexical).toBe(lexicalDoc("rev two"));
    });

    it("local revisions carry the full serialized post (Ember parity), not just the content fields", () => {
        const { result } = setup();
        const base = makeSnapshot();
        act(() => result.current.loadPost(makeSnapshot({
            featureImage: "https://example.com/feature.png",
            settings: {
                ...base.settings,
                visibility: "tiers",
                tiers: [{ id: "tier-1", name: "Bronze" }],
                authors: [{ id: "user-1", name: "Author One" }],
                featured: true,
                customTemplate: "custom-full-feature-image",
                canonicalUrl: "https://example.com/canonical",
                metaTitle: "Meta title",
                metaDescription: "Meta description",
                ogImage: "https://example.com/og.png",
                ogTitle: "OG title",
                ogDescription: "OG description",
                twitterImage: "https://example.com/twitter.png",
                twitterTitle: "Twitter title",
                twitterDescription: "Twitter description",
                codeinjectionHead: "<style>head</style>",
                codeinjectionFoot: "<style>foot</style>",
            },
        })));

        act(() => result.current.updateLexical(lexicalDoc("edited")));

        const [revision] = new LocalRevisionsStore().findAll();
        // same field NAMES as Ember's serialized post so a revision written
        // here restores identically from either admin shell
        expect(revision).toMatchObject({
            id: "post-1",
            type: "post",
            status: "draft",
            feature_image: "https://example.com/feature.png",
            published_at: null,
            visibility: "tiers",
            tiers: [{ id: "tier-1", name: "Bronze" }],
            authors: [{ id: "user-1", name: "Author One" }],
            featured: true,
            custom_template: "custom-full-feature-image",
            canonical_url: "https://example.com/canonical",
            meta_title: "Meta title",
            meta_description: "Meta description",
            og_image: "https://example.com/og.png",
            og_title: "OG title",
            og_description: "OG description",
            twitter_image: "https://example.com/twitter.png",
            twitter_title: "Twitter title",
            twitter_description: "Twitter description",
            codeinjection_head: "<style>head</style>",
            codeinjection_foot: "<style>foot</style>",
        });
        // page-only field is never written for posts (serializer parity)
        expect(revision.show_title_and_feature_image).toBeUndefined();
    });

    it("local revisions omit a null visibility and its tiers (Ember serializer parity)", () => {
        const { result } = setup();
        const base = makeSnapshot();
        act(() => result.current.loadPost(makeSnapshot({
            settings: { ...base.settings, visibility: null, tiers: [{ id: "tier-1", name: "Bronze" }] },
        })));

        act(() => result.current.updateLexical(lexicalDoc("edited")));

        const [revision] = new LocalRevisionsStore().findAll();
        expect(revision.visibility).toBeUndefined();
        expect(revision.tiers).toBeUndefined();
    });

    it("does not write local revisions for published posts", () => {
        const { result } = setup();
        act(() => result.current.loadPost(makeSnapshot({ status: "published" })));

        act(() => result.current.updateLexical(lexicalDoc("edited")));

        expect(new LocalRevisionsStore().findAll()).toHaveLength(0);
    });

    it("createNewPostSnapshot matches Koenig's blank document so opening the editor is not dirty", () => {
        const { result } = setup();
        act(() => result.current.loadPost(createNewPostSnapshot()));
        expect(result.current.state.lexicalScratch).toBe(BLANK_LEXICAL);
        expect(result.current.isDirty).toBe(false);
        expect(result.current.leaveDecision).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: false });
    });
});
