import { useCallback, useEffect, useRef, useState } from "react";
import {
    type EditorResource,
    type EditorResourceResponseType,
    type FullPost,
    useAddEditorPost,
    useEditEditorPost,
} from "@tryghost/admin-x-framework/api/editor";
import { useGenerateSlug } from "@tryghost/admin-x-framework/api/slugs";
import { LocalRevisionsStore } from "./local-revisions";
import {
    HostLimitError,
    JSONError,
    ServerUnreachableError,
    UpdateCollisionError,
} from "@tryghost/admin-x-framework/errors";
import {
    DEFAULT_TITLE,
    createDefaultPostSettings,
    createInitialState,
    getLeaveDecision,
    hasDirtyAttributes,
    isPastScheduledTime,
    transition,
    type EditorEffect,
    type EditorEvent,
    type EditorState,
    type LeaveDecision,
    type PostSnapshot,
    type PostStatus,
    type SaveKind,
    type SavePayload,
    type SaveError,
} from "./state";

/** Default lexical document for a new post (ghost/admin/app/models/post.js BLANK_LEXICAL). */
export const BLANK_LEXICAL = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

export function createNewPostSnapshot(resource: EditorResource = "posts"): PostSnapshot {
    return {
        id: null,
        status: "draft",
        title: "",
        lexical: BLANK_LEXICAL,
        customExcerpt: null,
        slug: "",
        tags: [],
        publishedAt: null,
        featureImage: null,
        updatedAt: null,
        settings: {
            ...createDefaultPostSettings(),
            // Ember models/post.js: showTitleAndFeatureImage defaults to true,
            // but the serializer only sends it for pages
            showTitleAndFeatureImage: resource === "pages" ? true : null,
        },
    };
}

export function toSnapshot(post: FullPost): PostSnapshot {
    return {
        id: post.id,
        status: post.status as PostStatus,
        title: post.title ?? "",
        lexical: post.lexical,
        customExcerpt: post.custom_excerpt,
        slug: post.slug ?? "",
        tags: (post.tags ?? []).map(tag => tag.name),
        publishedAt: post.published_at,
        featureImage: post.feature_image,
        updatedAt: post.updated_at,
        settings: {
            visibility: post.visibility ?? null,
            tiers: (post.tiers ?? []).map(({ id, name }) => ({ id, name })),
            authors: (post.authors ?? []).map(({ id, name }) => ({ id, name })),
            featured: post.featured ?? false,
            featureImageAlt: post.feature_image_alt ?? null,
            featureImageCaption: post.feature_image_caption ?? null,
            customTemplate: post.custom_template ?? null,
            canonicalUrl: post.canonical_url ?? null,
            metaTitle: post.meta_title ?? null,
            metaDescription: post.meta_description ?? null,
            ogImage: post.og_image ?? null,
            ogTitle: post.og_title ?? null,
            ogDescription: post.og_description ?? null,
            twitterImage: post.twitter_image ?? null,
            twitterTitle: post.twitter_title ?? null,
            twitterDescription: post.twitter_description ?? null,
            codeinjectionHead: post.codeinjection_head ?? null,
            codeinjectionFoot: post.codeinjection_foot ?? null,
            showTitleAndFeatureImage: post.show_title_and_feature_image ?? null,
        },
    };
}

function toSaveError(error: unknown, resource: EditorResource): SaveError {
    const noun = resource === "pages" ? "page" : "post";

    if (error instanceof UpdateCollisionError) {
        return { type: "conflict", message: `Saving failed! Someone else is editing this ${noun}.` };
    }
    if (error instanceof HostLimitError) {
        return { type: "host-limit", message: error.message };
    }
    if (error instanceof JSONError && (error.response?.status === 404 || error.data?.errors?.[0]?.type === "NotFoundError")) {
        return { type: "not-found", message: `Saving failed: this ${noun} has been deleted in a different session.` };
    }
    if (error instanceof ServerUnreachableError || error instanceof TypeError) {
        return { type: "offline", message: "Saving failed: please check your internet connection." };
    }
    if (error instanceof Error && error.message) {
        return { type: "generic", message: error.message };
    }
    return { type: "generic", message: "Saving failed: something went wrong." };
}

/**
 * Port of Ember's slug-candidate check in generateSlugTask: only auto-update
 * the slug when it still looks generated from the saved title (not a custom
 * slug typed by the user). This is a heuristic — the API is the source of
 * truth for the actual slug value.
 */
function looksLikeGeneratedSlug(title: string, slug: string): boolean {
    const simpleSlugified = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (simpleSlugified === slug) {
        return true;
    }
    // the server appends a uniqueness incrementor to generated slugs
    // (my-title -> my-title-2); without recognizing it, one collision would
    // make the slug look custom and freeze it at a partial/stale title
    const incrementorMatch = /^(.*)-\d+$/.exec(slug);
    return incrementorMatch !== null && incrementorMatch[1] === simpleSlugified;
}

/** Title suffix of duplicated posts (Ember DUPLICATED_POST_TITLE_SUFFIX). */
const DUPLICATED_POST_TITLE_SUFFIX = "(Copy)";

/**
 * Port of Ember's generateSlugTask guards (controllers/lexical-editor.js):
 * sync the slug with the title being saved, except when the slug was
 * customized by the user or the post only ever had an "untitled" slug.
 *
 * @param newTitle title this save is about to persist (the title scratch)
 * @param currentTitle last-persisted title
 * @param currentSlug current slug (last persisted or committed scratch)
 */
export function shouldRegenerateSlug(newTitle: string, currentTitle: string, currentSlug: string): boolean {
    // Only set an "untitled" slug once per post
    if (newTitle === DEFAULT_TITLE && currentSlug) {
        return false;
    }

    // Update the slug unless the slug looks to be a custom slug or the
    // title is a default/has been cleared out
    if (
        currentSlug && !looksLikeGeneratedSlug(currentTitle, currentSlug)
        && !(currentTitle === DEFAULT_TITLE || currentTitle.endsWith(DUPLICATED_POST_TITLE_SUFFIX))
    ) {
        return false;
    }

    return true;
}

export interface UseEditorOptions {
    resource: EditorResource;
    /** Called after a save created the post (id assigned), e.g. to swap the URL. */
    onPostCreated?: (post: FullPost) => void;
}

/**
 * Extra publish semantics for a manual save. Mirrors what Ember's
 * PublishOptions applies via _applyModelChanges (status intent, published_at,
 * email_only) and adapterOptions (newsletter + emailSegment query params)
 * around post.save().
 */
export interface ManualSaveOptions {
    /** Status intent applied before the save; omitted = keep current intent. */
    saveType?: "publish" | "schedule" | "draft";
    /** published_at to persist; null clears it (unschedule). */
    publishedAt?: string | null;
    /** email_only flag to persist (email sends only). */
    emailOnly?: boolean;
    /** Newsletter slug query param (email sends only). */
    newsletter?: string;
    /** Recipient filter query param (email sends only). */
    emailSegment?: string;
}

interface ManualSaveExtras {
    emailOnly?: boolean;
    newsletter?: string;
    emailSegment?: string;
}

interface Deferred {
    resolve: (post: FullPost) => void;
    reject: (error: unknown) => void;
}

export interface UseEditorResult {
    state: EditorState;
    isDirty: boolean;
    leaveDecision: LeaveDecision;
    dispatch: (event: EditorEvent) => void;
    /** Load (or re-load) a post into the machine. */
    loadPost: (post: PostSnapshot) => void;
    updateTitle: (value: string) => void;
    updateLexical: (value: string) => void;
    /**
     * Ember saveTitleTask: when the title of a draft changed, re-generate the
     * slug (unless it was customized) and save in the background.
     */
    saveTitle: () => void;
    /**
     * Ember updateSlugTask: clean the typed slug via the server (which also
     * enforces uniqueness), then persist it with a manual save. New posts
     * keep the slug in scratch and defer the save.
     */
    updateSlug: (newSlug: string) => Promise<void>;
    requestSave: (kind: SaveKind) => void;
    /**
     * Run a manual save with publish semantics and resolve with the saved
     * post once it completes (the publish/update flows await this). Rejects
     * when the save fails.
     */
    performManualSave: (options?: ManualSaveOptions) => Promise<FullPost>;
    /** Latest full post returned by a save, for data the machine doesn't model. */
    savedPost: FullPost | null;
    confirmLeave: () => void;
}

export function useEditor({ resource, onPostCreated }: UseEditorOptions): UseEditorResult {
    const [state, setState] = useState<EditorState>(createInitialState);
    const stateRef = useRef(state);

    const timersRef = useRef<{ autosave: number | null; timedSave: number | null }>({
        autosave: null,
        timedSave: null,
    });
    // Publish extras for the next manual save plus its completion promises;
    // extras are consumed by the manual request that carries them (a plain
    // manual save queued after a publish must not strip its email extras),
    // and all promises settle when the save queue drains (a manual save may
    // be queued behind an in-flight save, and several manual saves can be
    // pending at once — e.g. a settings field's blur-save racing the Update
    // button)
    const manualSaveExtrasRef = useRef<ManualSaveExtras | null>(null);
    const manualSaveDeferredsRef = useRef<Deferred[]>([]);
    const [savedPost, setSavedPost] = useState<FullPost | null>(null);

    const { mutateAsync: addPost } = useAddEditorPost();
    const { mutateAsync: editPost } = useEditEditorPost();
    const { generateSlug } = useGenerateSlug();

    // Keep the latest callbacks reachable from stable closures (timers, saves)
    const callbacksRef = useRef({ addPost, editPost, generateSlug, onPostCreated });
    callbacksRef.current = { addPost, editPost, generateSlug, onPostCreated };

    const clearTimers = useCallback(() => {
        const timers = timersRef.current;
        if (timers.autosave !== null) {
            window.clearTimeout(timers.autosave);
            timers.autosave = null;
        }
        if (timers.timedSave !== null) {
            window.clearTimeout(timers.timedSave);
            timers.timedSave = null;
        }
    }, []);

    const dispatchRef = useRef<(event: EditorEvent) => void>(() => {});

    const performSave = useCallback(async (kind: SaveKind, payload: SavePayload) => {
        const { addPost: add, editPost: edit, generateSlug: generate, onPostCreated: created } = callbacksRef.current;

        // Ember beforeSaveTask: every save that keeps the post a draft and
        // carries a changed title re-generates the slug from the new title
        // first (unless it was customized — generateSlugTask's guards). This
        // runs per-save, so a new post created from the first few title
        // keystrokes converges onto the full title as the background saves
        // drain — regenerating only on title blur left the slug stuck at the
        // partial title the create-save happened to carry.
        let slug = payload.slug;
        const lastSavedTitle = stateRef.current.post?.title ?? "";
        if (payload.status === "draft" && payload.title !== lastSavedTitle
            && shouldRegenerateSlug(payload.title, lastSavedTitle, slug)) {
            try {
                const generated = await generate({ type: "post", text: payload.title, modelId: payload.id ?? undefined });
                if (generated) {
                    slug = generated;
                }
            } catch {
                // slug generation is best-effort (Ember swallows errors too)
            }
        }

        const body: Partial<FullPost> = {
            title: payload.title,
            lexical: payload.lexical,
            custom_excerpt: payload.customExcerpt,
            status: payload.status,
            published_at: payload.publishedAt,
            feature_image: payload.featureImage,
            feature_image_alt: payload.settings.featureImageAlt,
            feature_image_caption: payload.settings.featureImageCaption,
            // the API matches existing tags by name and creates missing ones,
            // so name-only tag objects are sufficient (Ember sends the same
            // embedded relation; order determines the primary tag)
            tags: payload.tags.map(name => ({ name })) as unknown as FullPost["tags"],
            featured: payload.settings.featured,
            custom_template: payload.settings.customTemplate,
            canonical_url: payload.settings.canonicalUrl,
            meta_title: payload.settings.metaTitle,
            meta_description: payload.settings.metaDescription,
            og_image: payload.settings.ogImage,
            og_title: payload.settings.ogTitle,
            og_description: payload.settings.ogDescription,
            twitter_image: payload.settings.twitterImage,
            twitter_title: payload.settings.twitterTitle,
            twitter_description: payload.settings.twitterDescription,
            codeinjection_head: payload.settings.codeinjectionHead,
            codeinjection_foot: payload.settings.codeinjectionFoot,
        };
        // Ember serializers/post.js: a null visibility is never sent (the
        // server applies the site default on create) and tiers ride along
        // with visibility; show_title_and_feature_image is page-only
        if (payload.settings.visibility !== null) {
            body.visibility = payload.settings.visibility;
            body.tiers = payload.settings.tiers.map(({ id }) => ({ id })) as unknown as FullPost["tiers"];
        }
        // an empty authors list is never sent (the server assigns the
        // creating user on create; existing posts always have authors)
        if (payload.settings.authors.length > 0) {
            body.authors = payload.settings.authors.map(({ id }) => ({ id })) as unknown as FullPost["authors"];
        }
        if (payload.settings.showTitleAndFeatureImage !== null) {
            body.show_title_and_feature_image = payload.settings.showTitleAndFeatureImage;
        }
        // an empty slug is never sent (the server generates one on create)
        if (slug) {
            body.slug = slug;
        }

        // manual saves can carry publish extras (email_only flag plus the
        // newsletter/email_segment query params that trigger email sending);
        // they're consumed per-request so they apply to exactly one save
        const extras = kind === "manual" ? manualSaveExtrasRef.current : null;
        if (kind === "manual") {
            manualSaveExtrasRef.current = null;
        }
        if (extras?.emailOnly !== undefined) {
            body.email_only = extras.emailOnly;
        }

        try {
            let response: EditorResourceResponseType;
            if (payload.id === null) {
                response = await add({ post: body, resource });
            } else {
                // updated_at is read from the latest snapshot (not the payload)
                // so queued saves after a success don't trigger 409 collisions
                const updatedAt = stateRef.current.post?.updatedAt ?? "";
                response = await edit({
                    id: payload.id,
                    post: { ...body, updated_at: updatedAt },
                    resource,
                    newsletter: extras?.newsletter,
                    emailSegment: extras?.emailSegment,
                });
            }

            const saved = (response.posts ?? response.pages)?.[0];
            if (!saved) {
                throw new Error("Save response did not include the saved post.");
            }

            setSavedPost(saved);
            dispatchRef.current({ type: "SAVE_SUCCEEDED", post: toSnapshot(saved) });
            if (payload.id === null) {
                created?.(saved);
            }

            // pending manual saves resolve only once the machine's save
            // queue is drained: a manual request may have been QUEUED
            // behind an earlier in-flight save (e.g. a settings field's
            // blur-save), and its changes are only persisted when the last
            // queued save completes — resolving on the first manual-kind
            // success showed "Updated" while edits were still unsaved
            if (stateRef.current.save.status === "idle") {
                const deferreds = manualSaveDeferredsRef.current;
                manualSaveDeferredsRef.current = [];
                deferreds.forEach(deferred => deferred.resolve(saved));
            }
        } catch (error) {
            dispatchRef.current({ type: "SAVE_FAILED", error: toSaveError(error, resource) });

            // any failure settles all pending manual-save promises: either a
            // manual save itself failed, or it was queued behind this failed
            // save and the machine dropped the queue
            manualSaveExtrasRef.current = null;
            const deferreds = manualSaveDeferredsRef.current;
            manualSaveDeferredsRef.current = [];
            deferreds.forEach(deferred => deferred.reject(error));
        }
    }, [resource]);

    const executeEffects = useCallback((effects: EditorEffect[]) => {
        const timers = timersRef.current;

        for (const effect of effects) {
            switch (effect.type) {
                case "timer/cancel-all":
                    clearTimers();
                    break;

                case "timer/restart-autosave":
                    if (timers.autosave !== null) {
                        window.clearTimeout(timers.autosave);
                    }
                    timers.autosave = window.setTimeout(() => {
                        timers.autosave = null;
                        dispatchRef.current({ type: "SAVE_REQUESTED", kind: "autosave" });
                    }, effect.delayMs);
                    break;

                case "timer/ensure-timed-save":
                    if (timers.timedSave === null) {
                        timers.timedSave = window.setTimeout(() => {
                            timers.timedSave = null;
                            dispatchRef.current({ type: "SAVE_REQUESTED", kind: "timed" });
                        }, effect.intervalMs);
                    }
                    break;

                case "save/perform":
                    void performSave(effect.kind, effect.payload);
                    break;
            }
        }
    }, [clearTimers, performSave]);

    const dispatch = useCallback((event: EditorEvent) => {
        // the machine is clock-free, so `post.pastScheduledTime` is computed
        // here (the hook boundary) for every save request that didn't supply
        // it — a manual save of a scheduled post whose time already passed
        // must publish immediately (Ember saveTask line 621)
        const resolved: EditorEvent = event.type === "SAVE_REQUESTED" && event.pastScheduledTime === undefined
            ? { ...event, pastScheduledTime: isPastScheduledTime(stateRef.current, Date.now(), event.publishedAt) }
            : event;

        const { state: next, effects } = transition(stateRef.current, resolved);
        stateRef.current = next;
        setState(next);
        executeEffects(effects);
    }, [executeEffects]);
    dispatchRef.current = dispatch;

    // clear timers on unmount
    useEffect(() => clearTimers, [clearTimers]);

    // Crash-recovery revisions, mirroring Ember's updateScratch /
    // updateTitleScratch call sites (controllers/lexical-editor.js): every
    // content scratch change schedules a throttled localStorage revision of
    // the current draft. The store owns throttling/eviction; the machine
    // deliberately doesn't know about it.
    const localRevisionsRef = useRef<LocalRevisionsStore | null>(null);
    if (localRevisionsRef.current === null) {
        localRevisionsRef.current = new LocalRevisionsStore();
    }
    useEffect(() => () => localRevisionsRef.current?.destroy(), []);

    const scheduleLocalRevision = useCallback(() => {
        const current = stateRef.current;
        const post = current.post;
        if (!post) {
            return;
        }

        try {
            // Same revision shape as Ember's serialized post (Ember passes
            // `post.serialize({includeId: true})`, i.e. the FULL post): the
            // store and the /restore screen are shared between the two admin
            // shells, so the field names must match serializers/post.js for
            // cross-shell restore parity. scheduleSave itself drops anything
            // that isn't a draft.
            const settings = current.settingsScratch;
            const revision: Parameters<LocalRevisionsStore["scheduleSave"]>[1] = {
                id: post.id ?? undefined,
                status: post.status,
                title: current.titleScratch,
                lexical: current.lexicalScratch ?? post.lexical,
                excerpt: current.customExcerptScratch ?? post.customExcerpt,
                custom_excerpt: current.customExcerptScratch ?? post.customExcerpt,
                slug: current.slugScratch || post.slug,
                tags: current.tagNamesScratch.map(name => ({ name })),
                authors: settings.authors.map(({ id, name }) => ({ id, name })),
                published_at: current.publishedAtScratch,
                feature_image: current.featureImageScratch,
                feature_image_alt: settings.featureImageAlt,
                feature_image_caption: settings.featureImageCaption,
                featured: settings.featured,
                custom_template: settings.customTemplate,
                canonical_url: settings.canonicalUrl,
                meta_title: settings.metaTitle,
                meta_description: settings.metaDescription,
                og_image: settings.ogImage,
                og_title: settings.ogTitle,
                og_description: settings.ogDescription,
                twitter_image: settings.twitterImage,
                twitter_title: settings.twitterTitle,
                twitter_description: settings.twitterDescription,
                codeinjection_head: settings.codeinjectionHead,
                codeinjection_foot: settings.codeinjectionFoot,
            };
            // Ember serializers/post.js: a null visibility is never sent and
            // tiers ride along with visibility; show_title_and_feature_image
            // is page-only
            if (settings.visibility !== null) {
                revision.visibility = settings.visibility;
                revision.tiers = settings.tiers.map(({ id, name }) => ({ id, name }));
            }
            if (settings.showTitleAndFeatureImage !== null) {
                revision.show_title_and_feature_image = settings.showTitleAndFeatureImage;
            }
            localRevisionsRef.current?.scheduleSave(resource === "pages" ? "page" : "post", revision);
        } catch {
            // ignore revision save errors (same as Ember)
        }
    }, [resource]);

    const loadPost = useCallback((post: PostSnapshot) => {
        dispatch({ type: "POST_LOADED", post });
    }, [dispatch]);

    const updateTitle = useCallback((value: string) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "title", value });
        scheduleLocalRevision();
    }, [dispatch, scheduleLocalRevision]);

    const updateLexical = useCallback((value: string) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "lexical", value });
        scheduleLocalRevision();
    }, [dispatch, scheduleLocalRevision]);

    const requestSave = useCallback((kind: SaveKind) => {
        dispatch({ type: "SAVE_REQUESTED", kind });
    }, [dispatch]);

    const performManualSave = useCallback((options: ManualSaveOptions = {}) => {
        return new Promise<FullPost>((resolve, reject) => {
            const current = stateRef.current;
            if (!current.post) {
                reject(new Error("No post loaded."));
                return;
            }

            const previousPublishedAt = current.publishedAtScratch;
            const appliedPublishedAt = options.publishedAt;
            const publishedAtChanged = appliedPublishedAt !== undefined
                && appliedPublishedAt !== previousPublishedAt;

            // extras don't reset when absent: pending extras belong to an
            // earlier (queued) manual save and are consumed by the request
            // that carries them — a plain save must not strip them
            if (options.emailOnly !== undefined || options.newsletter || options.emailSegment) {
                manualSaveExtrasRef.current = {
                    emailOnly: options.emailOnly,
                    newsletter: options.newsletter,
                    emailSegment: options.emailSegment,
                };
            }

            manualSaveDeferredsRef.current.push({
                resolve,
                reject: (error: unknown) => {
                    // Ember reverts the applied model changes when a publish
                    // save fails so the editor doesn't show unsaved publish
                    // state (_revertModelChanges) — but only when the scratch
                    // still holds the value this save applied; an edit made
                    // while the save was in flight must survive the revert
                    if (publishedAtChanged && stateRef.current.publishedAtScratch === appliedPublishedAt) {
                        dispatchRef.current({ type: "SCRATCH_CHANGED", field: "publishedAt", value: previousPublishedAt });
                    }
                    reject(error instanceof Error ? error : new Error(String(error)));
                },
            });

            // the full intent rides on the save request so it survives being
            // queued behind an in-flight save (the machine re-applies it when
            // the queued save runs)
            dispatchRef.current({
                type: "SAVE_REQUESTED",
                kind: "manual",
                saveType: options.saveType,
                publishedAt: options.publishedAt,
            });
        });
    }, []);

    const saveTitle = useCallback(() => {
        const current = stateRef.current;
        const post = current.post;
        if (!post) {
            return;
        }

        const newTitle = current.titleScratch.trim();
        const currentTitle = post.title;

        // Ember saveTitleTask: no-op when the title didn't change
        if ((currentTitle && newTitle && newTitle === currentTitle) || (!currentTitle && !newTitle)) {
            return;
        }

        // drafts save automatically on title change; published/scheduled wait
        // for a manual save. The slug regeneration itself happens inside the
        // save (performSave's beforeSaveTask port), so it also covers title
        // changes persisted by background autosaves without a blur.
        if (post.status !== "draft") {
            return;
        }

        dispatchRef.current({ type: "SAVE_REQUESTED", kind: "autosave" });
    }, []);

    /**
     * Port of Ember's updateSlugTask (lexical-editor controller lines
     * 775-825): sanitize/uniquify the candidate slug via the slugs API, keep
     * the existing slug when the only difference is the server's uniqueness
     * incrementor, then save (deferred for new posts).
     */
    const updateSlug = useCallback(async (newSlugInput: string) => {
        const post = stateRef.current.post;
        if (!post) {
            return;
        }

        const slug = post.slug;
        // reset the scratch (and therefore the input) to its previous state
        const resetScratch = () => dispatchRef.current({ type: "SCRATCH_CHANGED", field: "slug", value: slug });

        const newSlug = (newSlugInput || slug).trim();

        // ignore unchanged slugs or candidate slugs that are empty
        if (!newSlug || newSlug === slug) {
            resetScratch();
            return;
        }

        // commit the raw candidate into the machine scratch immediately so
        // the editor is dirty while the async sanitize runs — the leave
        // guard then saves/confirms instead of dropping the slug edit (Ember
        // waited on updateSlugTask in _confirmLeave); the server result (or
        // a reset) replaces it below
        dispatchRef.current({ type: "SCRATCH_CHANGED", field: "slug", value: newSlug });

        let serverSlug = "";
        try {
            serverSlug = await callbacksRef.current.generateSlug({ type: "post", text: newSlug, modelId: post.id ?? undefined });
        } catch {
            resetScratch();
            return;
        }

        // the sanitized + unique slug may come back equal to the existing one
        if (!serverSlug || serverSlug === slug) {
            resetScratch();
            return;
        }

        // when the server only appended a uniqueness incrementor to the
        // existing slug (my-slug -> my-slug-2), keep the existing slug
        const slugTokens = serverSlug.split("-");
        const check = Number(slugTokens.pop());
        if (Number.isFinite(check) && check > 0 && slug === slugTokens.join("-") && serverSlug !== newSlug) {
            resetScratch();
            return;
        }

        dispatchRef.current({ type: "SCRATCH_CHANGED", field: "slug", value: serverSlug });

        // new posts defer the save until the post is created
        if (post.id === null) {
            return;
        }

        dispatchRef.current({ type: "SAVE_REQUESTED", kind: "manual" });
    }, []);

    const confirmLeave = useCallback(() => {
        dispatch({ type: "LEAVE_CONFIRMED" });
    }, [dispatch]);

    return {
        state,
        isDirty: hasDirtyAttributes(state),
        leaveDecision: getLeaveDecision(state),
        dispatch,
        loadPost,
        updateTitle,
        updateLexical,
        saveTitle,
        updateSlug,
        requestSave,
        performManualSave,
        savedPost,
        confirmLeave,
    };
}
