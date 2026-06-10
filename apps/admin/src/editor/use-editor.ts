import { useCallback, useEffect, useRef, useState } from "react";
import {
    type EditorResource,
    type EditorResourceResponseType,
    type FullPost,
    useAddEditorPost,
    useEditEditorPost,
} from "@tryghost/admin-x-framework/api/editor";
import { useGenerateSlug } from "@tryghost/admin-x-framework/api/slugs";
import {
    HostLimitError,
    JSONError,
    ServerUnreachableError,
    UpdateCollisionError,
} from "@tryghost/admin-x-framework/errors";
import {
    createInitialState,
    getLeaveDecision,
    hasDirtyAttributes,
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

export function createNewPostSnapshot(): PostSnapshot {
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
    return simpleSlugified === slug;
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
    const pendingSlugRef = useRef<string | null>(null);

    // Publish extras for the next manual save plus its completion promises;
    // all settle when the save queue drains (a manual save may be queued
    // behind an in-flight save, and several manual saves can be pending at
    // once — e.g. a settings field's blur-save racing the Update button)
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
        const { addPost: add, editPost: edit, onPostCreated: created } = callbacksRef.current;

        const body: Partial<FullPost> = {
            title: payload.title,
            lexical: payload.lexical,
            custom_excerpt: payload.customExcerpt,
            status: payload.status,
            published_at: payload.publishedAt,
            feature_image: payload.featureImage,
            // the API matches existing tags by name and creates missing ones,
            // so name-only tag objects are sufficient (Ember sends the same
            // embedded relation; order determines the primary tag)
            tags: payload.tags.map(name => ({ name })) as unknown as FullPost["tags"],
        };
        // a slug regenerated from a title change wins over the scratch value;
        // an empty slug is never sent (the server generates one on create)
        const slug = pendingSlugRef.current ?? payload.slug;
        if (slug) {
            body.slug = slug;
        }

        // manual saves can carry publish extras (email_only flag plus the
        // newsletter/email_segment query params that trigger email sending)
        const extras = kind === "manual" ? manualSaveExtrasRef.current : null;
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

            pendingSlugRef.current = null;
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
                manualSaveExtrasRef.current = null;
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
        const { state: next, effects } = transition(stateRef.current, event);
        stateRef.current = next;
        setState(next);
        executeEffects(effects);
    }, [executeEffects]);
    dispatchRef.current = dispatch;

    // clear timers on unmount
    useEffect(() => clearTimers, [clearTimers]);

    const loadPost = useCallback((post: PostSnapshot) => {
        pendingSlugRef.current = null;
        dispatch({ type: "POST_LOADED", post });
    }, [dispatch]);

    const updateTitle = useCallback((value: string) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "title", value });
    }, [dispatch]);

    const updateLexical = useCallback((value: string) => {
        dispatch({ type: "SCRATCH_CHANGED", field: "lexical", value });
    }, [dispatch]);

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
            const publishedAtChanged = options.publishedAt !== undefined
                && options.publishedAt !== previousPublishedAt;

            if (publishedAtChanged) {
                dispatchRef.current({ type: "SCRATCH_CHANGED", field: "publishedAt", value: options.publishedAt ?? null });
            }
            if (options.saveType) {
                dispatchRef.current({ type: "SET_SAVE_TYPE", saveType: options.saveType });
            }

            if (options.emailOnly !== undefined || options.newsletter || options.emailSegment) {
                manualSaveExtrasRef.current = {
                    emailOnly: options.emailOnly,
                    newsletter: options.newsletter,
                    emailSegment: options.emailSegment,
                };
            } else {
                manualSaveExtrasRef.current = null;
            }

            manualSaveDeferredsRef.current.push({
                resolve,
                reject: (error: unknown) => {
                    // Ember reverts the applied model changes when a publish
                    // save fails so the editor doesn't show unsaved publish
                    // state (_revertModelChanges)
                    if (publishedAtChanged) {
                        dispatchRef.current({ type: "SCRATCH_CHANGED", field: "publishedAt", value: previousPublishedAt });
                    }
                    reject(error instanceof Error ? error : new Error(String(error)));
                },
            });

            dispatchRef.current({ type: "SAVE_REQUESTED", kind: "manual" });
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
        // for a manual save
        if (post.status !== "draft") {
            return;
        }

        const save = () => dispatchRef.current({ type: "SAVE_REQUESTED", kind: "autosave" });

        // Ember generateSlugTask: re-slug drafts whose slug is empty or still
        // derived from the saved title (i.e. not customized by the user)
        const shouldGenerateSlug = !post.slug || looksLikeGeneratedSlug(currentTitle, post.slug);
        if (shouldGenerateSlug && newTitle) {
            callbacksRef.current
                .generateSlug({ type: "post", text: newTitle, modelId: post.id ?? undefined })
                .then((slug) => {
                    if (slug) {
                        pendingSlugRef.current = slug;
                    }
                })
                .catch(() => {
                    // slug generation is best-effort (Ember swallows errors too)
                })
                .finally(save);
        } else {
            save();
        }
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
