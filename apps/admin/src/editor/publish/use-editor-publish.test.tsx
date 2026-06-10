import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
    AddEditorPostPayload,
    EditEditorPostPayload,
    EditorResourceResponseType,
    FullPost,
} from "@tryghost/admin-x-framework/api/editor";
import type { PostSnapshot } from "@/editor/state";
import { toSnapshot, useEditor } from "@/editor/use-editor";

const mocks = vi.hoisted(() => ({
    addPost: vi.fn<(payload: AddEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    editPost: vi.fn<(payload: EditEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    generateSlug: vi.fn<() => Promise<string>>(),
}));

vi.mock("@tryghost/admin-x-framework/api/editor", () => ({
    useAddEditorPost: () => ({ mutateAsync: mocks.addPost }),
    useEditEditorPost: () => ({ mutateAsync: mocks.editPost }),
}));

vi.mock("@tryghost/admin-x-framework/api/slugs", () => ({
    useGenerateSlug: () => ({ generateSlug: mocks.generateSlug }),
}));

function makeFullPost(overrides: Partial<FullPost> = {}): FullPost {
    return {
        id: "post-1",
        uuid: "uuid-1",
        title: "My post",
        slug: "my-post",
        lexical: null,
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

function setup(snapshot: PostSnapshot) {
    const hook = renderHook(() => useEditor({ resource: "posts" }));
    act(() => {
        hook.result.current.loadPost(snapshot);
    });
    return hook;
}

describe("useEditor performManualSave (publish semantics)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.generateSlug.mockResolvedValue("");
    });

    it("schedules with published_at and the newsletter/email_segment params", async () => {
        const saved = makeFullPost({ status: "scheduled", published_at: "2050-01-01T10:00:00.000Z" });
        mocks.editPost.mockResolvedValue({ posts: [saved] });

        const { result } = setup(toSnapshot(makeFullPost()));

        let returned: FullPost | undefined;
        await act(async () => {
            returned = await result.current.performManualSave({
                saveType: "schedule",
                publishedAt: "2050-01-01T10:00:00.000Z",
                emailOnly: false,
                newsletter: "default-newsletter",
                emailSegment: "status:free,status:-free",
            });
        });

        expect(mocks.editPost).toHaveBeenCalledTimes(1);
        expect(mocks.editPost).toHaveBeenCalledWith(expect.objectContaining({
            id: "post-1",
            newsletter: "default-newsletter",
            emailSegment: "status:free,status:-free",
            post: expect.objectContaining({
                status: "scheduled",
                published_at: "2050-01-01T10:00:00.000Z",
                email_only: false,
            }) as unknown,
        }));
        expect(returned).toBe(saved);
        expect(result.current.savedPost).toBe(saved);
        expect(result.current.state.post?.status).toBe("scheduled");
    });

    it("publishes without email params when not emailing", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ status: "published" })] });

        const { result } = setup(toSnapshot(makeFullPost()));

        await act(async () => {
            await result.current.performManualSave({ saveType: "publish" });
        });

        const payload = mocks.editPost.mock.calls[0][0];
        expect(payload.newsletter).toBeUndefined();
        expect(payload.emailSegment).toBeUndefined();
        expect(payload.post.status).toBe("published");
        expect("email_only" in payload.post).toBe(false);
    });

    it("reverts scheduled posts to draft and clears published_at", async () => {
        const scheduled = makeFullPost({ status: "scheduled", published_at: "2050-01-01T10:00:00.000Z" });
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ status: "draft" })] });

        const { result } = setup(toSnapshot(scheduled));

        await act(async () => {
            await result.current.performManualSave({
                saveType: "draft",
                publishedAt: null,
                emailOnly: false,
            });
        });

        expect(mocks.editPost.mock.calls[0][0].post).toMatchObject({
            status: "draft",
            published_at: null,
        });
        expect(result.current.state.post?.status).toBe("draft");
    });

    it("rejects and restores the publish date when the save fails", async () => {
        mocks.editPost.mockRejectedValue(new Error("boom"));

        const { result } = setup(toSnapshot(makeFullPost()));

        let error: unknown;
        await act(async () => {
            try {
                await result.current.performManualSave({
                    saveType: "schedule",
                    publishedAt: "2050-01-01T10:00:00.000Z",
                });
            } catch (e) {
                error = e;
            }
        });

        expect(error).toBeInstanceOf(Error);
        // status and publish date scratch revert (Ember _revertModelChanges)
        expect(result.current.state.post?.status).toBe("draft");
        expect(result.current.state.publishedAtScratch).toBeNull();
        expect(result.current.state.save.status).toBe("error");
    });

    it("does not leak email extras into subsequent saves", async () => {
        mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ status: "published" })] });

        const { result } = setup(toSnapshot(makeFullPost()));

        await act(async () => {
            await result.current.performManualSave({
                saveType: "publish",
                emailOnly: false,
                newsletter: "default-newsletter",
                emailSegment: "all",
            });
        });
        await act(async () => {
            await result.current.performManualSave();
        });

        expect(mocks.editPost).toHaveBeenCalledTimes(2);
        const second = mocks.editPost.mock.calls[1][0];
        expect(second.newsletter).toBeUndefined();
        expect(second.emailSegment).toBeUndefined();
        expect("email_only" in second.post).toBe(false);
    });
});
