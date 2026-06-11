import { describe, expect, it } from "vitest";
import {
    AUTOSAVE_DELAY,
    DEFAULT_TITLE,
    TIMED_SAVE_INTERVAL,
    createDefaultPostSettings,
    createInitialState,
    getLeaveDecision,
    hasDirtyAttributes,
    isPastScheduledTime,
    transition,
    type EditorEffect,
    type EditorState,
    type PostSnapshot,
    type PostStatus,
    type SaveError,
    type SaveKind,
    type SavePayload,
} from "./editor-machine";

/* helpers -------------------------------------------------------------------*/

function lexicalDoc(text: string, {
    direction = null,
    nestedDirection = null,
}: { direction?: string | null; nestedDirection?: string | null } = {}): string {
    return JSON.stringify({
        root: {
            children: [{
                children: [{ text, type: "text", direction: nestedDirection }],
                direction,
                type: "paragraph",
                version: 1,
            }],
            direction: null,
            type: "root",
            version: 1,
        },
    });
}

const BLANK_LEXICAL = lexicalDoc("");

function makePost(overrides: Partial<PostSnapshot> = {}): PostSnapshot {
    return {
        id: "post-1",
        status: "draft",
        title: "My post",
        lexical: lexicalDoc("hello"),
        customExcerpt: null,
        slug: "my-post",
        tags: [],
        publishedAt: null,
        featureImage: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
        settings: createDefaultPostSettings(),
        ...overrides,
    };
}

function loadPost(overrides: Partial<PostSnapshot> = {}): EditorState {
    return transition(createInitialState(), { type: "POST_LOADED", post: makePost(overrides) }).state;
}

function startManualSave(state: EditorState, pastScheduledTime?: boolean) {
    return transition(state, { type: "SAVE_REQUESTED", kind: "manual", pastScheduledTime });
}

function savePerformEffect(effects: EditorEffect[]) {
    return effects.find((effect): effect is { type: "save/perform"; kind: SaveKind; payload: SavePayload } => {
        return effect.type === "save/perform";
    });
}

function genericError(): SaveError {
    return { type: "generic", message: "boom" };
}

function expectSaving(state: EditorState, kind: SaveKind) {
    expect(state.save).toMatchObject({ status: "saving", kind });
}

/* dirty detection -----------------------------------------------------------*/

describe("hasDirtyAttributes", () => {
    it("is false with no post loaded", () => {
        expect(hasDirtyAttributes(createInitialState())).toBe(false);
    });

    it("is false for a freshly loaded post", () => {
        expect(hasDirtyAttributes(loadPost())).toBe(false);
    });

    describe("title", () => {
        it("is true when the title scratch differs", () => {
            const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "title", value: "New title" });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false for a whitespace-only title change (trimmed comparison)", () => {
            const { state } = transition(loadPost({ title: "My post" }), {
                type: "SCRATCH_CHANGED",
                field: "title",
                value: "  My post \n",
            });
            expect(hasDirtyAttributes(state)).toBe(false);
        });

        it("is true when the title is cleared", () => {
            const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "title", value: "" });
            expect(hasDirtyAttributes(state)).toBe(true);
        });
    });

    describe("lexical", () => {
        it("is true when the lexical content differs", () => {
            const { state } = transition(loadPost(), {
                type: "SCRATCH_CHANGED",
                field: "lexical",
                value: lexicalDoc("hello world"),
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false when only top-level `direction` fields differ", () => {
            const { state } = transition(loadPost({ lexical: lexicalDoc("hello", { direction: null }) }), {
                type: "SCRATCH_CHANGED",
                field: "lexical",
                value: lexicalDoc("hello", { direction: "ltr" }),
            });
            expect(hasDirtyAttributes(state)).toBe(false);
        });

        it("is true when a nested `direction` field differs (Ember only normalizes top-level children)", () => {
            const { state } = transition(loadPost({ lexical: lexicalDoc("hello") }), {
                type: "SCRATCH_CHANGED",
                field: "lexical",
                value: lexicalDoc("hello", { nestedDirection: "ltr" }),
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false when the saved lexical is null (comparison requires both sides, as in Ember)", () => {
            const { state } = transition(loadPost({ lexical: null }), {
                type: "SCRATCH_CHANGED",
                field: "lexical",
                value: lexicalDoc("typed"),
            });
            expect(hasDirtyAttributes(state)).toBe(false);
        });

        it("is false when the scratch has not been initialized", () => {
            const state = loadPost({ lexical: lexicalDoc("hello") });
            expect(hasDirtyAttributes({ ...state, lexicalScratch: null })).toBe(false);
        });
    });

    describe("tags", () => {
        it("is true when a tag is added", () => {
            const { state } = transition(loadPost({ tags: ["news"] }), { type: "TAGS_CHANGED", tagNames: ["news", "tech"] });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true when a tag is removed", () => {
            const { state } = transition(loadPost({ tags: ["news", "tech"] }), { type: "TAGS_CHANGED", tagNames: ["news"] });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true when tags are reordered (Ember compares joined name strings)", () => {
            const { state } = transition(loadPost({ tags: ["news", "tech"] }), { type: "TAGS_CHANGED", tagNames: ["tech", "news"] });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false when the same tags are reassigned", () => {
            const { state } = transition(loadPost({ tags: ["news", "tech"] }), { type: "TAGS_CHANGED", tagNames: ["news", "tech"] });
            expect(hasDirtyAttributes(state)).toBe(false);
        });
    });

    describe("excerpt", () => {
        it("is true when the excerpt changes", () => {
            const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "customExcerpt", value: "An excerpt" });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true when a saved excerpt is cleared to empty string (exact comparison)", () => {
            const { state } = transition(loadPost({ customExcerpt: "old" }), {
                type: "SCRATCH_CHANGED",
                field: "customExcerpt",
                value: "",
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false when the excerpt is restored to the saved value", () => {
            let { state } = transition(loadPost({ customExcerpt: "old" }), {
                type: "SCRATCH_CHANGED",
                field: "customExcerpt",
                value: "new",
            });
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "customExcerpt", value: "old" }));
            expect(hasDirtyAttributes(state)).toBe(false);
        });
    });

    describe("settings fields (slug / publish date / feature image)", () => {
        it("is true when the slug scratch differs", () => {
            const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "slug", value: "custom-slug" });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true when the publish date scratch differs", () => {
            const { state } = transition(loadPost(), {
                type: "SCRATCH_CHANGED",
                field: "publishedAt",
                value: "2026-01-05T10:00:00.000Z",
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true when the feature image scratch differs", () => {
            const { state } = transition(loadPost({ featureImage: "/img/old.png" }), {
                type: "SCRATCH_CHANGED",
                field: "featureImage",
                value: null,
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is false when the settings fields match the snapshot", () => {
            const state = loadPost({
                slug: "custom",
                publishedAt: "2026-01-05T10:00:00.000Z",
                featureImage: "/img/cover.png",
            });
            expect(hasDirtyAttributes(state)).toBe(false);
        });
    });

    describe("save errors", () => {
        it("is true after a failed save even when scratch matches the snapshot (Ember post.isError)", () => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            expect(hasDirtyAttributes(state)).toBe(true);
        });
    });

    describe("new posts (changedAttributes semantics)", () => {
        it("is false for a pristine new post", () => {
            expect(hasDirtyAttributes(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL, slug: "" }))).toBe(false);
        });

        it("is true once the body is edited", () => {
            const { state } = transition(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL, slug: "" }), {
                type: "SCRATCH_CHANGED",
                field: "lexical",
                value: lexicalDoc("first words"),
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("is true once the excerpt is set", () => {
            const { state } = transition(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL, slug: "" }), {
                type: "SCRATCH_CHANGED",
                field: "customExcerpt",
                value: "excerpt",
            });
            expect(hasDirtyAttributes(state)).toBe(true);
        });
    });
});

/* scratch changes + autosave directives --------------------------------------*/

describe("SCRATCH_CHANGED", () => {
    it("updates the title scratch without touching the snapshot", () => {
        const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "title", value: "New" });
        expect(state.titleScratch).toBe("New");
        expect(state.post?.title).toBe("My post");
    });

    it("is a no-op when no post is loaded", () => {
        const initial = createInitialState();
        const { state, effects } = transition(initial, { type: "SCRATCH_CHANGED", field: "title", value: "New" });
        expect(state).toBe(initial);
        expect(effects).toEqual([]);
    });

    it("emits a debounce restart and ensures the timed-save timer on body edits to an existing draft", () => {
        const { effects } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "lexical", value: lexicalDoc("x") });
        expect(effects).toEqual([
            { type: "timer/restart-autosave", delayMs: AUTOSAVE_DELAY },
            { type: "timer/ensure-timed-save", intervalMs: TIMED_SAVE_INTERVAL },
        ]);
    });

    it("emits an immediate autosave (0ms) on the first body edit of a new unsaved post", () => {
        const { effects } = transition(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL }), {
            type: "SCRATCH_CHANGED",
            field: "lexical",
            value: lexicalDoc("x"),
        });
        expect(effects).toEqual([
            { type: "timer/restart-autosave", delayMs: 0 },
            { type: "timer/ensure-timed-save", intervalMs: TIMED_SAVE_INTERVAL },
        ]);
    });

    it("emits no timer directives for body edits to a published post (no autosave outside drafts)", () => {
        const { effects } = transition(loadPost({ status: "published" }), {
            type: "SCRATCH_CHANGED",
            field: "lexical",
            value: lexicalDoc("x"),
        });
        expect(effects).toEqual([]);
    });

    it("emits an immediate autosave (0ms) on a title edit to a new unsaved post so the draft gets created", () => {
        const { effects } = transition(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL, slug: "" }), {
            type: "SCRATCH_CHANGED",
            field: "title",
            value: "Hello",
        });
        expect(effects).toEqual([
            { type: "timer/restart-autosave", delayMs: 0 },
            { type: "timer/ensure-timed-save", intervalMs: TIMED_SAVE_INTERVAL },
        ]);
    });

    it.each(["title", "customExcerpt", "slug", "publishedAt", "featureImage"] as const)("emits no timer directives for %s edits to an existing post", (field) => {
        const { effects } = transition(loadPost(), { type: "SCRATCH_CHANGED", field, value: "x" });
        expect(effects).toEqual([]);
    });

    it.each(["customExcerpt", "slug", "publishedAt", "featureImage"] as const)("emits no timer directives for %s edits to a new post", (field) => {
        const { effects } = transition(loadPost({ id: null, title: "", lexical: BLANK_LEXICAL, slug: "" }), {
            type: "SCRATCH_CHANGED",
            field,
            value: "x",
        });
        expect(effects).toEqual([]);
    });

    it("updates the settings scratches without touching the snapshot", () => {
        let { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "slug", value: "new-slug" });
        ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "publishedAt", value: "2026-01-05T10:00:00.000Z" }));
        ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "featureImage", value: "/img/cover.png" }));

        expect(state.slugScratch).toBe("new-slug");
        expect(state.publishedAtScratch).toBe("2026-01-05T10:00:00.000Z");
        expect(state.featureImageScratch).toBe("/img/cover.png");
        expect(state.post).toEqual(makePost());
    });
});

/* PSM settings (visibility/authors/meta data/...) ----------------------------*/

describe("SETTINGS_CHANGED", () => {
    it("ignores the event when no post is loaded", () => {
        const { state, effects } = transition(createInitialState(), {
            type: "SETTINGS_CHANGED",
            settings: { featured: true },
        });
        expect(state.settingsScratch.featured).toBe(false);
        expect(effects).toEqual([]);
    });

    it("merges partial updates into the settings scratch without scheduling autosaves", () => {
        const { state, effects } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { metaTitle: "SEO title", featured: true },
        });
        expect(state.settingsScratch.metaTitle).toBe("SEO title");
        expect(state.settingsScratch.featured).toBe(true);
        // untouched fields keep their values
        expect(state.settingsScratch.visibility).toBeNull();
        expect(effects).toEqual([]);
    });

    it("makes the state dirty (scalar field)", () => {
        const { state } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { codeinjectionHead: "<style></style>" },
        });
        expect(hasDirtyAttributes(state)).toBe(true);
    });

    it("makes the state dirty on relation reorder (authors compare by id sequence)", () => {
        const authors = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
        const loaded = loadPost({ settings: { ...createDefaultPostSettings(), authors } });
        expect(hasDirtyAttributes(loaded)).toBe(false);

        const { state } = transition(loaded, {
            type: "SETTINGS_CHANGED",
            settings: { authors: [authors[1], authors[0]] },
        });
        expect(hasDirtyAttributes(state)).toBe(true);
    });

    it("is not dirty when a relation is replaced by an equivalent list", () => {
        const tiers = [{ id: "tier-1", name: "Bronze" }];
        const loaded = loadPost({ settings: { ...createDefaultPostSettings(), visibility: "tiers", tiers } });
        const { state } = transition(loaded, {
            type: "SETTINGS_CHANGED",
            settings: { tiers: [{ id: "tier-1", name: "Bronze" }] },
        });
        expect(hasDirtyAttributes(state)).toBe(false);
    });

    it("copies the settings scratch into the save payload", () => {
        const { state } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { visibility: "members", featured: true, ogTitle: "OG" },
        });
        const { effects } = startManualSave(state);
        expect(savePerformEffect(effects)?.payload.settings).toMatchObject({
            visibility: "members",
            featured: true,
            ogTitle: "OG",
        });
    });

    it("resyncs the settings scratch from the persisted snapshot after a save", () => {
        const { state } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { canonicalUrl: "https://example.com/a" },
        });
        const saving = startManualSave(state).state;

        // server normalized the canonical url
        const persistedSettings = { ...createDefaultPostSettings(), canonicalUrl: "https://example.com/a/" };
        const { state: after } = transition(saving, {
            type: "SAVE_SUCCEEDED",
            post: makePost({ settings: persistedSettings }),
        });

        expect(after.settingsScratch.canonicalUrl).toBe("https://example.com/a/");
        expect(hasDirtyAttributes(after)).toBe(false);
    });

    it("keeps settings edits made while a save was in flight (per-field resync)", () => {
        const { state } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { metaTitle: "Sent title" },
        });
        const saving = startManualSave(state).state;

        // edit a DIFFERENT field while the save is in flight
        const { state: edited } = transition(saving, {
            type: "SETTINGS_CHANGED",
            settings: { metaDescription: "Typed during save" },
        });

        const { state: after } = transition(edited, {
            type: "SAVE_SUCCEEDED",
            post: makePost({
                settings: { ...createDefaultPostSettings(), metaTitle: "Sent title" },
            }),
        });

        // the sent field resynced; the in-flight edit survived
        expect(after.settingsScratch.metaTitle).toBe("Sent title");
        expect(after.settingsScratch.metaDescription).toBe("Typed during save");
        expect(hasDirtyAttributes(after)).toBe(true);
    });

    it("keeps an in-flight edit to the SAME field over the persisted value", () => {
        const { state } = transition(loadPost(), {
            type: "SETTINGS_CHANGED",
            settings: { metaTitle: "Sent title" },
        });
        const saving = startManualSave(state).state;

        const { state: edited } = transition(saving, {
            type: "SETTINGS_CHANGED",
            settings: { metaTitle: "Newer title" },
        });

        const { state: after } = transition(edited, {
            type: "SAVE_SUCCEEDED",
            post: makePost({
                settings: { ...createDefaultPostSettings(), metaTitle: "Sent title" },
            }),
        });

        expect(after.settingsScratch.metaTitle).toBe("Newer title");
    });

    describe("feature image alt/caption (canvas feature image)", () => {
        it("makes the state dirty when the alt text or caption changes", () => {
            const altChanged = transition(loadPost(), {
                type: "SETTINGS_CHANGED",
                settings: { featureImageAlt: "A skyline" },
            }).state;
            expect(hasDirtyAttributes(altChanged)).toBe(true);

            const captionChanged = transition(loadPost(), {
                type: "SETTINGS_CHANGED",
                settings: { featureImageCaption: "Photo by <b>someone</b>" },
            }).state;
            expect(hasDirtyAttributes(captionChanged)).toBe(true);
        });

        it("is not dirty when alt/caption are loaded from the snapshot", () => {
            const settings = {
                ...createDefaultPostSettings(),
                featureImageAlt: "A skyline",
                featureImageCaption: "Photo by someone",
            };
            const state = loadPost({ featureImage: "https://example.com/image.jpg", settings });
            expect(state.settingsScratch.featureImageAlt).toBe("A skyline");
            expect(state.settingsScratch.featureImageCaption).toBe("Photo by someone");
            expect(hasDirtyAttributes(state)).toBe(false);
        });

        it("carries alt + caption in the save payload settings", () => {
            const { state } = transition(loadPost(), {
                type: "SETTINGS_CHANGED",
                settings: { featureImageAlt: "Alt text", featureImageCaption: "Caption" },
            });
            const { effects } = startManualSave(state);
            expect(savePerformEffect(effects)?.payload.settings).toMatchObject({
                featureImageAlt: "Alt text",
                featureImageCaption: "Caption",
            });
        });

        it("clears image + alt + caption together without dirty leftovers (Ember clearFeatureImage)", () => {
            const settings = {
                ...createDefaultPostSettings(),
                featureImageAlt: "Alt",
                featureImageCaption: "Caption",
            };
            const loaded = loadPost({ featureImage: "https://example.com/image.jpg", settings });

            let state = transition(loaded, { type: "SCRATCH_CHANGED", field: "featureImage", value: null }).state;
            state = transition(state, {
                type: "SETTINGS_CHANGED",
                settings: { featureImageAlt: null, featureImageCaption: null },
            }).state;
            expect(hasDirtyAttributes(state)).toBe(true);

            const saving = transition(state, { type: "SAVE_REQUESTED", kind: "autosave" });
            const payload = savePerformEffect(saving.effects)?.payload;
            expect(payload?.featureImage).toBeNull();
            expect(payload?.settings.featureImageAlt).toBeNull();
            expect(payload?.settings.featureImageCaption).toBeNull();

            const { state: after } = transition(saving.state, {
                type: "SAVE_SUCCEEDED",
                post: makePost({ featureImage: null }),
            });
            expect(hasDirtyAttributes(after)).toBe(false);
        });

        it("resyncs alt/caption from the persisted snapshot only when unchanged since the save", () => {
            const { state } = transition(loadPost(), {
                type: "SETTINGS_CHANGED",
                settings: { featureImageAlt: "Sent alt" },
            });
            const saving = startManualSave(state).state;

            // the user keeps typing while the save is in flight
            const { state: edited } = transition(saving, {
                type: "SETTINGS_CHANGED",
                settings: { featureImageAlt: "Newer alt" },
            });

            const { state: after } = transition(edited, {
                type: "SAVE_SUCCEEDED",
                post: makePost({ settings: { ...createDefaultPostSettings(), featureImageAlt: "Sent alt" } }),
            });
            expect(after.settingsScratch.featureImageAlt).toBe("Newer alt");
        });
    });

    it("initializes the settings scratch from the loaded post", () => {
        const settings = {
            ...createDefaultPostSettings(),
            visibility: "paid",
            featured: true,
            authors: [{ id: "a", name: "A" }],
        };
        const state = loadPost({ settings });
        expect(state.settingsScratch).toEqual(settings);
        // the scratch is a copy — mutating the snapshot must not leak
        expect(state.settingsScratch).not.toBe(settings);
        expect(state.settingsScratch.authors[0]).not.toBe(settings.authors[0]);
        expect(hasDirtyAttributes(state)).toBe(false);
    });
});

/* save lifecycle --------------------------------------------------------------*/

describe("save lifecycle", () => {
    it("manual save starts even when nothing is dirty", () => {
        const { state, effects } = startManualSave(loadPost());
        expectSaving(state, "manual");
        expect(effects[0]).toEqual({ type: "timer/cancel-all" });
        expect(savePerformEffect(effects)).toBeDefined();
    });

    it("background save is skipped when nothing is dirty but still cancels timers", () => {
        const { state, effects } = transition(loadPost(), { type: "SAVE_REQUESTED", kind: "autosave" });
        expect(state.save.status).toBe("idle");
        expect(effects).toEqual([{ type: "timer/cancel-all" }]);
    });

    it("background save starts when dirty", () => {
        const { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "lexical", value: lexicalDoc("x") });
        const result = transition(state, { type: "SAVE_REQUESTED", kind: "autosave" });
        expectSaving(result.state, "autosave");
        expect(savePerformEffect(result.effects)?.payload.lexical).toBe(lexicalDoc("x"));
    });

    it("leave save bypasses the dirty check", () => {
        const { state, effects } = transition(loadPost(), { type: "SAVE_REQUESTED", kind: "leave" });
        expectSaving(state, "leave");
        expect(savePerformEffect(effects)).toBeDefined();
    });

    it.each(["autosave", "timed"] as const)("%s save is ignored for non-draft posts", (kind) => {
        const { state } = transition(loadPost({ status: "published" }), {
            type: "SCRATCH_CHANGED",
            field: "title",
            value: "changed",
        });
        const result = transition(state, { type: "SAVE_REQUESTED", kind });
        expect(result.state.save.status).toBe("idle");
        expect(result.effects).toEqual([]);
    });

    it("is a no-op when no post is loaded", () => {
        const { state, effects } = startManualSave(createInitialState());
        expect(state.save.status).toBe("idle");
        expect(effects).toEqual([]);
    });

    describe("payload", () => {
        it("copies scratch values, forces a blank title to (Untitled) and normalizes empty lexical to null", () => {
            let { state } = transition(loadPost({ title: "" }), { type: "SCRATCH_CHANGED", field: "lexical", value: "" });
            ({ state } = transition(state, { type: "TAGS_CHANGED", tagNames: ["news"] }));
            const result = startManualSave(state);
            const payload = savePerformEffect(result.effects)?.payload;
            expect(payload).toEqual({
                id: "post-1",
                status: "draft",
                title: DEFAULT_TITLE,
                lexical: null,
                customExcerpt: null,
                tags: ["news"],
                slug: "my-post",
                publishedAt: null,
                featureImage: null,
                settings: createDefaultPostSettings(),
            });
            // the scratch is normalized too, matching Ember beforeSaveTask
            expect(result.state.titleScratch).toBe(DEFAULT_TITLE);
        });

        it("uses a null id for new unsaved posts so the caller performs a create", () => {
            const { effects } = startManualSave(loadPost({ id: null }));
            expect(savePerformEffect(effects)?.payload.id).toBeNull();
        });

        it("copies the committed settings scratches (slug / publish date / feature image)", () => {
            let { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "slug", value: "custom-slug" });
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "publishedAt", value: "2026-01-05T10:00:00.000Z" }));
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "featureImage", value: "/img/cover.png" }));
            const { effects } = startManualSave(state);
            expect(savePerformEffect(effects)?.payload).toMatchObject({
                slug: "custom-slug",
                publishedAt: "2026-01-05T10:00:00.000Z",
                featureImage: "/img/cover.png",
            });
        });
    });

    describe("concurrency", () => {
        function savingState(kind: SaveKind = "manual"): EditorState {
            // dirty the state first so background saves aren't skipped
            const dirty = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "lexical", value: lexicalDoc("edited") }).state;
            const { state } = transition(dirty, { type: "SAVE_REQUESTED", kind, pastScheduledTime: false });
            expectSaving(state, kind);
            return state;
        }

        it("background saves never run while a save is in flight — they enqueue", () => {
            const { state, effects } = transition(savingState(), { type: "SAVE_REQUESTED", kind: "autosave" });
            expect(state.save).toMatchObject({ status: "saving", queued: { kind: "autosave" } });
            expect(effects).toEqual([]);
        });

        it("queued background saves are latest-wins", () => {
            let { state } = transition(savingState(), { type: "SAVE_REQUESTED", kind: "autosave" });
            ({ state } = transition(state, { type: "SAVE_REQUESTED", kind: "timed" }));
            expect(state.save).toMatchObject({ status: "saving", queued: { kind: "timed" } });
        });

        it("a manual save supersedes a queued autosave", () => {
            let { state } = transition(savingState(), { type: "SAVE_REQUESTED", kind: "autosave" });
            ({ state } = transition(state, { type: "SAVE_REQUESTED", kind: "manual" }));
            expect(state.save).toMatchObject({ status: "saving", queued: { kind: "manual" } });
        });

        it("a queued manual save is never downgraded by a later background request", () => {
            let { state } = transition(savingState(), { type: "SAVE_REQUESTED", kind: "manual" });
            ({ state } = transition(state, { type: "SAVE_REQUESTED", kind: "autosave" }));
            expect(state.save).toMatchObject({ status: "saving", queued: { kind: "manual" } });
        });

        it("runs a queued manual save after the in-flight save succeeds", () => {
            const { state } = transition(savingState("autosave"), { type: "SAVE_REQUESTED", kind: "manual" });
            const result = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() });
            expectSaving(result.state, "manual");
            expect(savePerformEffect(result.effects)).toBeDefined();
        });

        it("drops a queued background save when the completed save left the state clean", () => {
            const { state } = transition(savingState("manual"), { type: "SAVE_REQUESTED", kind: "autosave" });
            // server echoes the saved content, so the state is clean afterwards
            const result = transition(state, { type: "SAVE_SUCCEEDED", post: makePost({ lexical: lexicalDoc("edited") }) });
            expect(result.state.save.status).toBe("idle");
            expect(savePerformEffect(result.effects)).toBeUndefined();
        });

        it("runs a queued background save when scratch changed during the in-flight save", () => {
            let { state } = transition(savingState("manual"), { type: "SAVE_REQUESTED", kind: "autosave" });
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "lexical", value: lexicalDoc("typed during save") }));
            const result = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() });
            expectSaving(result.state, "autosave");
            expect(savePerformEffect(result.effects)?.payload.lexical).toBe(lexicalDoc("typed during save"));
        });

        it("drops the queue when the in-flight save fails", () => {
            let { state } = transition(savingState("manual"), { type: "SAVE_REQUESTED", kind: "autosave" });
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            expect(state.save.status).toBe("error");
        });

        it("a queued publish stays a publish (the intent survives the in-flight save's status resync)", () => {
            // autosave in flight; the publish flow requests a manual publish
            const { state } = transition(savingState("autosave"), { type: "SAVE_REQUESTED", kind: "manual", saveType: "publish" });
            expect(state.save).toMatchObject({ status: "saving", queued: { kind: "manual", saveType: "publish" } });

            // the autosave succeeds as a draft, which resyncs willPublish to
            // false — the queued intent must re-apply before the queued save
            const result = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() });
            expectSaving(result.state, "manual");
            expect(savePerformEffect(result.effects)?.payload.status).toBe("published");
        });

        it("a later plain manual request does not strip a queued publish intent", () => {
            let { state } = transition(savingState("autosave"), { type: "SAVE_REQUESTED", kind: "manual", saveType: "publish" });
            // e.g. a settings field blur-save while the publish is queued
            ({ state } = transition(state, { type: "SAVE_REQUESTED", kind: "manual" }));
            expect(state.save).toMatchObject({ queued: { kind: "manual", saveType: "publish" } });

            const result = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() });
            expect(savePerformEffect(result.effects)?.payload.status).toBe("published");
        });

        it("a queued unschedule still unschedules and clears the publish date", () => {
            const scheduled = loadPost({ status: "scheduled", publishedAt: "2050-01-01T10:00:00.000Z" });
            // a manual save (e.g. a settings blur) is in flight
            let { state } = transition(scheduled, { type: "SAVE_REQUESTED", kind: "manual" });
            // the update flow queues the unschedule
            ({ state } = transition(state, { type: "SAVE_REQUESTED", kind: "manual", saveType: "draft", publishedAt: null }));

            // the in-flight save succeeds echoing the scheduled snapshot
            const result = transition(state, {
                type: "SAVE_SUCCEEDED",
                post: makePost({ status: "scheduled", publishedAt: "2050-01-01T10:00:00.000Z" }),
            });
            const payload = savePerformEffect(result.effects)?.payload;
            expect(payload?.status).toBe("draft");
            expect(payload?.publishedAt).toBeNull();
        });
    });

    describe("SAVE_SUCCEEDED", () => {
        it("applies the persisted snapshot and returns to idle", () => {
            const saved = makePost({ title: "Server title", slug: "server-slug", updatedAt: "2026-06-09T00:00:00.000Z" });
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: saved }));
            expect(state.post).toEqual(saved);
            expect(state.save).toEqual({ status: "idle" });
        });

        it("keeps scratch values typed during the save (state stays dirty)", () => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "title", value: "typed during save" }));
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() }));
            expect(state.titleScratch).toBe("typed during save");
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("does not resync settings scratches edited while the save was in flight", () => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "slug", value: "typed-during-save" }));
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "publishedAt", value: "2026-02-02T00:00:00.000Z" }));
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "featureImage", value: "/img/new.png" }));
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: makePost() }));

            expect(state.slugScratch).toBe("typed-during-save");
            expect(state.publishedAtScratch).toBe("2026-02-02T00:00:00.000Z");
            expect(state.featureImageScratch).toBe("/img/new.png");
            expect(hasDirtyAttributes(state)).toBe(true);
        });

        it("resyncs the settings scratches from the persisted snapshot (server may normalize them)", () => {
            let { state } = transition(loadPost(), { type: "SCRATCH_CHANGED", field: "slug", value: "typed-slug" });
            ({ state } = startManualSave(state));
            const saved = makePost({
                slug: "typed-slug-2",
                publishedAt: "2026-01-05T10:00:00.000Z",
                featureImage: "/img/cover.png",
            });
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: saved }));

            expect(state.slugScratch).toBe("typed-slug-2");
            expect(state.publishedAtScratch).toBe("2026-01-05T10:00:00.000Z");
            expect(state.featureImageScratch).toBe("/img/cover.png");
            expect(hasDirtyAttributes(state)).toBe(false);
        });

        it("assigns the id returned for a new post", () => {
            let { state } = startManualSave(loadPost({ id: null }));
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: makePost({ id: "new-id" }) }));
            expect(state.post?.id).toBe("new-id");
        });

        it("re-derives willPublish/willSchedule from the persisted status", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            ({ state } = startManualSave(state));
            ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: makePost({ status: "published" }) }));
            expect(state.willPublish).toBe(true);
            expect(state.willSchedule).toBe(false);
        });

        it("is ignored when no save is in flight", () => {
            const idle = loadPost();
            const { state, effects } = transition(idle, { type: "SAVE_SUCCEEDED", post: makePost({ title: "stale" }) });
            expect(state).toBe(idle);
            expect(effects).toEqual([]);
        });
    });

    describe("SAVE_FAILED", () => {
        it("moves to the error state and carries the error payload", () => {
            const error: SaveError = { type: "conflict", message: "Saving failed! Someone else is editing this post." };
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_FAILED", error }));
            expect(state.save).toEqual({ status: "error", kind: "manual", error });
        });

        it.each([
            "conflict", "host-limit", "not-found", "offline", "generic",
        ] as const)("preserves the %s error type for UI branching", (type) => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_FAILED", error: { type, message: "m" } }));
            expect(state.save).toMatchObject({ status: "error", error: { type } });
        });

        it("is ignored when no save is in flight", () => {
            const idle = loadPost();
            const { state, effects } = transition(idle, { type: "SAVE_FAILED", error: genericError() });
            expect(state).toBe(idle);
            expect(effects).toEqual([]);
        });

        it("allows a new save to start from the error state", () => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            const result = startManualSave(state);
            expectSaving(result.state, "manual");
        });

        it("a failed save keeps the state dirty so a retrying autosave is not skipped", () => {
            let { state } = startManualSave(loadPost());
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            const result = transition(state, { type: "SAVE_REQUESTED", kind: "autosave" });
            expectSaving(result.state, "autosave");
        });
    });
});

/* status transitions ------------------------------------------------------------*/

describe("status transitions", () => {
    function manualSaveStatus(state: EditorState, pastScheduledTime = false): PostStatus | undefined {
        const { effects } = startManualSave(state, pastScheduledTime);
        return savePerformEffect(effects)?.payload.status;
    }

    describe("manual saves apply willPublish/willSchedule intents", () => {
        it("draft -> published via willPublish", () => {
            const { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            expect(manualSaveStatus(state)).toBe("published");
        });

        it("draft -> scheduled via willSchedule", () => {
            const { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "schedule" });
            expect(manualSaveStatus(state)).toBe("scheduled");
        });

        it("draft stays draft without intents", () => {
            expect(manualSaveStatus(loadPost())).toBe("draft");
        });

        it("published stays published (willPublish derived from status)", () => {
            expect(manualSaveStatus(loadPost({ status: "published" }))).toBe("published");
        });

        it("published -> draft (unpublish)", () => {
            const { state } = transition(loadPost({ status: "published" }), { type: "SET_SAVE_TYPE", saveType: "draft" });
            expect(manualSaveStatus(state)).toBe("draft");
        });

        it("scheduled stays scheduled (willSchedule derived from status)", () => {
            expect(manualSaveStatus(loadPost({ status: "scheduled" }))).toBe("scheduled");
        });

        it("scheduled -> draft (unschedule)", () => {
            const { state } = transition(loadPost({ status: "scheduled" }), { type: "SET_SAVE_TYPE", saveType: "draft" });
            expect(manualSaveStatus(state)).toBe("draft");
        });

        it("sent is terminal", () => {
            expect(manualSaveStatus(loadPost({ status: "sent" }))).toBe("sent");
        });

        it("past scheduled time with an intent set publishes immediately", () => {
            expect(manualSaveStatus(loadPost({ status: "scheduled" }), true)).toBe("published");
        });

        it("scheduled -> published when the manual save carries pastScheduledTime (willSchedule derived from status)", () => {
            // a scheduled post whose publish date already passed: a plain
            // manual save (Update button, settings blur) publishes it
            const state = loadPost({ status: "scheduled", publishedAt: "2020-01-01T10:00:00.000Z" });
            const { effects } = transition(state, { type: "SAVE_REQUESTED", kind: "manual", pastScheduledTime: true });
            expect(savePerformEffect(effects)?.payload.status).toBe("published");
        });

        it("past scheduled time with no intents reverts to draft", () => {
            const { state } = transition(loadPost({ status: "scheduled" }), { type: "SET_SAVE_TYPE", saveType: "draft" });
            expect(manualSaveStatus(state, true)).toBe("draft");
        });
    });

    describe("isPastScheduledTime (dispatch-site helper)", () => {
        const now = Date.parse("2026-06-10T12:00:00.000Z");

        it("is true for a scheduled post whose publish date passed", () => {
            const state = loadPost({ status: "scheduled", publishedAt: "2026-06-10T11:00:00.000Z" });
            expect(isPastScheduledTime(state, now)).toBe(true);
        });

        it("is false for future dates, non-scheduled posts and missing dates", () => {
            expect(isPastScheduledTime(loadPost({ status: "scheduled", publishedAt: "2026-06-10T13:00:00.000Z" }), now)).toBe(false);
            expect(isPastScheduledTime(loadPost({ status: "published", publishedAt: "2026-06-10T11:00:00.000Z" }), now)).toBe(false);
            expect(isPastScheduledTime(loadPost({ status: "scheduled", publishedAt: null }), now)).toBe(false);
            expect(isPastScheduledTime(createInitialState(), now)).toBe(false);
        });

        it("uses the publishedAt carried by the request over the scratch (reschedules)", () => {
            const state = loadPost({ status: "scheduled", publishedAt: "2026-06-10T11:00:00.000Z" });
            // rescheduling to the future must not force an immediate publish
            expect(isPastScheduledTime(state, now, "2026-06-10T13:00:00.000Z")).toBe(false);
            // clearing the date (unschedule) is never "past"
            expect(isPastScheduledTime(state, now, null)).toBe(false);
        });
    });

    describe("background saves force draft and never transition status", () => {
        it("autosave forces status draft even with willPublish set", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            ({ state } = transition(state, { type: "SCRATCH_CHANGED", field: "lexical", value: lexicalDoc("x") }));
            const result = transition(state, { type: "SAVE_REQUESTED", kind: "timed" });
            expect(savePerformEffect(result.effects)?.payload.status).toBe("draft");
        });
    });

    describe("leave saves never change status", () => {
        it("keeps the draft status even with willPublish set", () => {
            const { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            const result = transition(state, { type: "SAVE_REQUESTED", kind: "leave" });
            expect(savePerformEffect(result.effects)?.payload.status).toBe("draft");
        });
    });

    describe("error revert", () => {
        it("a failed publish reverts the in-flight status to draft and disarms the intent", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            ({ state } = startManualSave(state));
            expect(state.post?.status).toBe("published"); // in-flight, mirrors Ember setting post.status pre-save
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            expect(state.post?.status).toBe("draft");
            // intent resets to match the reverted status (Ember _revertModelChanges)
            expect(state.willPublish).toBe(false);
        });

        it("after a failed publish a plain manual save (e.g. settings blur) stays a draft save", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            ({ state } = startManualSave(state));
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));

            const retry = startManualSave(state);
            expect(savePerformEffect(retry.effects)?.payload.status).toBe("draft");
        });

        it("a failed schedule disarms willSchedule", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "schedule" });
            ({ state } = startManualSave(state));
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            expect(state.post?.status).toBe("draft");
            expect(state.willSchedule).toBe(false);
        });

        it("a failed unschedule reverts to scheduled and re-arms willSchedule", () => {
            let { state } = transition(loadPost({ status: "scheduled" }), { type: "SET_SAVE_TYPE", saveType: "draft" });
            ({ state } = startManualSave(state));
            expect(state.post?.status).toBe("draft");
            ({ state } = transition(state, { type: "SAVE_FAILED", error: genericError() }));
            expect(state.post?.status).toBe("scheduled");
            // a later plain manual save must keep the post scheduled
            expect(state.willSchedule).toBe(true);
            const retry = startManualSave(state);
            expect(savePerformEffect(retry.effects)?.payload.status).toBe("scheduled");
        });
    });

    describe("SET_SAVE_TYPE", () => {
        it.each([
            ["publish", true, false],
            ["schedule", false, true],
            ["draft", false, false],
        ] as const)("%s sets willPublish=%s willSchedule=%s", (saveType, willPublish, willSchedule) => {
            const { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType });
            expect(state.willPublish).toBe(willPublish);
            expect(state.willSchedule).toBe(willSchedule);
        });

        it("publish and schedule are mutually exclusive", () => {
            let { state } = transition(loadPost(), { type: "SET_SAVE_TYPE", saveType: "publish" });
            ({ state } = transition(state, { type: "SET_SAVE_TYPE", saveType: "schedule" }));
            expect(state.willPublish).toBe(false);
            expect(state.willSchedule).toBe(true);
        });
    });
});

/* leave decision ------------------------------------------------------------------*/

describe("getLeaveDecision", () => {
    function dirtyState(status: PostStatus): EditorState {
        return transition(loadPost({ status }), { type: "SCRATCH_CHANGED", field: "title", value: "changed" }).state;
    }

    it("allows leaving silently with no post", () => {
        expect(getLeaveDecision(createInitialState())).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: false });
    });

    it.each(["draft", "published", "scheduled", "sent"] as const)("allows leaving a clean %s post silently", (status) => {
        expect(getLeaveDecision(loadPost({ status }))).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: false });
    });

    it("saves a dirty draft on leave without confirmation", () => {
        expect(getLeaveDecision(dirtyState("draft"))).toEqual({ shouldSaveOnLeave: true, shouldConfirmLeave: false });
    });

    it.each(["published", "scheduled", "sent"] as const)("requires confirmation for a dirty %s post", (status) => {
        expect(getLeaveDecision(dirtyState(status))).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: true });
    });

    it("escalates a dirty draft to confirmation once a leave-save was already performed", () => {
        const state = { ...dirtyState("draft"), saveOnLeavePerformed: true };
        expect(getLeaveDecision(state)).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: true });
    });

    it("does not ask again after the user confirmed leaving", () => {
        const { state } = transition(dirtyState("published"), { type: "LEAVE_CONFIRMED" });
        expect(getLeaveDecision(state)).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: false });
    });

    it("a successful leave-save marks saveOnLeavePerformed and leaves cleanly", () => {
        let { state } = transition(dirtyState("draft"), { type: "SAVE_REQUESTED", kind: "leave" });
        ({ state } = transition(state, { type: "SAVE_SUCCEEDED", post: makePost({ title: "changed" }) }));
        expect(state.saveOnLeavePerformed).toBe(true);
        expect(getLeaveDecision(state)).toEqual({ shouldSaveOnLeave: false, shouldConfirmLeave: false });
    });
});

/* lifecycle housekeeping --------------------------------------------------------*/

describe("POST_LOADED / RESET / CANCEL_AUTOSAVE", () => {
    it("POST_LOADED snapshots the post, seeds scratch values and cancels timers", () => {
        const post = makePost({ customExcerpt: "excerpt", tags: ["news"] });
        const { state, effects } = transition(createInitialState(), { type: "POST_LOADED", post });
        expect(state.post).toEqual(post);
        expect(state.titleScratch).toBe(post.title);
        expect(state.lexicalScratch).toBe(post.lexical);
        expect(state.customExcerptScratch).toBe("excerpt");
        expect(state.tagNamesScratch).toEqual(["news"]);
        expect(effects).toEqual([{ type: "timer/cancel-all" }]);
    });

    it.each([
        ["draft", false, false],
        ["published", true, false],
        ["scheduled", false, true],
        ["sent", false, false],
    ] as const)("POST_LOADED derives intents for a %s post", (status, willPublish, willSchedule) => {
        const state = loadPost({ status });
        expect(state.willPublish).toBe(willPublish);
        expect(state.willSchedule).toBe(willSchedule);
    });

    it("POST_LOADED clears state left over from a previous post", () => {
        let { state } = transition(dirtyLoaded(), { type: "LEAVE_CONFIRMED" });
        ({ state } = transition(state, { type: "POST_LOADED", post: makePost({ id: "post-2" }) }));
        expect(state.leaveConfirmed).toBe(false);
        expect(state.saveOnLeavePerformed).toBe(false);
        expect(hasDirtyAttributes(state)).toBe(false);

        function dirtyLoaded() {
            return transition(loadPost(), { type: "SCRATCH_CHANGED", field: "title", value: "changed" }).state;
        }
    });

    it("RESET returns to the initial state and cancels timers", () => {
        const { state, effects } = transition(loadPost(), { type: "RESET" });
        expect(state).toEqual(createInitialState());
        expect(effects).toEqual([{ type: "timer/cancel-all" }]);
    });

    it("CANCEL_AUTOSAVE emits a cancel-all directive without changing state", () => {
        const loaded = loadPost();
        const { state, effects } = transition(loaded, { type: "CANCEL_AUTOSAVE" });
        expect(state).toBe(loaded);
        expect(effects).toEqual([{ type: "timer/cancel-all" }]);
    });
});
