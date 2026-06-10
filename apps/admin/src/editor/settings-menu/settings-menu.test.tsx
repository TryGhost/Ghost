import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
    EditEditorPostPayload,
    EditorResource,
    EditorResourceResponseType,
    FullPost,
} from "@tryghost/admin-x-framework/api/editor";
import type { GenerateSlugPayload } from "@tryghost/admin-x-framework/api/slugs";
import type { PostSnapshot } from "@/editor/state";
import { useEditor } from "@/editor/use-editor";
import { SettingsMenu } from "./settings-menu";

const mocks = vi.hoisted(() => ({
    addPost: vi.fn<() => Promise<EditorResourceResponseType>>(),
    editPost: vi.fn<(payload: EditEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    generateSlug: vi.fn<(payload: GenerateSlugPayload) => Promise<string>>(),
    deletePost: vi.fn<(id: string) => Promise<unknown>>(),
    bulkDelete: vi.fn<(payload: { filter: string; resource?: string }) => Promise<unknown>>(),
    navigate: vi.fn<(to: string) => void>(),
    upload: vi.fn<() => Promise<Array<{ url?: string; fileName: string }> | null>>(),
    tags: [
        { id: "tag-1", name: "News", slug: "news" },
        { id: "tag-2", name: "Tech", slug: "tech" },
    ],
}));

vi.mock("@/utils/cross-shell-navigate", () => ({
    crossShellNavigate: (to: string) => mocks.navigate(to),
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    useKoenigFileUpload: () => ({
        upload: mocks.upload,
        isLoading: false,
        errors: [],
        progress: 0,
        filesNumber: 0,
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/editor", () => ({
    useAddEditorPost: () => ({ mutateAsync: mocks.addPost }),
    useEditEditorPost: () => ({ mutateAsync: mocks.editPost }),
}));

vi.mock("@tryghost/admin-x-framework/api/slugs", () => ({
    useGenerateSlug: () => ({ generateSlug: mocks.generateSlug }),
}));

vi.mock("@tryghost/admin-x-framework/api/posts", () => ({
    useDeletePost: () => ({ mutateAsync: mocks.deletePost }),
    useBulkDeletePosts: () => ({ mutateAsync: mocks.bulkDelete }),
}));

vi.mock("@tryghost/admin-x-framework/api/settings", () => ({
    useBrowseSettings: () => ({ data: { settings: [{ key: "timezone", value: "Etc/UTC" }] } }),
    getSettingValue: (settings: Array<{ key: string; value: unknown }> | undefined, key: string) => {
        return settings?.find(setting => setting.key === key)?.value ?? null;
    },
}));

vi.mock("@tryghost/admin-x-framework/api/tags", () => ({
    useBrowseTags: () => ({ data: { tags: mocks.tags } }),
}));

function makeSnapshot(overrides: Partial<PostSnapshot> = {}): PostSnapshot {
    return {
        id: "post-1",
        status: "draft",
        title: "My post",
        lexical: null,
        customExcerpt: null,
        slug: "my-post",
        tags: [],
        publishedAt: null,
        featureImage: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

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
        updated_at: "2026-01-02T00:00:00.000Z",
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

function Harness({ snapshot, resource = "posts" }: { snapshot: PostSnapshot; resource?: EditorResource }) {
    const editor = useEditor({ resource });
    const { loadPost } = editor;

    useEffect(() => {
        loadPost(snapshot);
    }, [loadPost, snapshot]);

    return <SettingsMenu editor={editor} resource={resource} />;
}

function renderMenu(snapshot: PostSnapshot = makeSnapshot(), resource: EditorResource = "posts") {
    return render(<Harness resource={resource} snapshot={snapshot} />);
}

function postUrlInput(): HTMLInputElement {
    return screen.getByRole("textbox", { name: "Post URL" });
}

function excerptField(): HTMLTextAreaElement {
    const element = document.querySelector('[data-test-field="custom-excerpt"]');
    expect(element).not.toBeNull();
    return element as HTMLTextAreaElement;
}

function lastEditedPost(): Partial<FullPost> {
    expect(mocks.editPost).toHaveBeenCalled();
    return mocks.editPost.mock.calls.at(-1)![0].post;
}

describe("SettingsMenu", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.editPost.mockImplementation(({ post }) => Promise.resolve({
            posts: [makeFullPost(post as Partial<FullPost>)],
        }));
        mocks.generateSlug.mockResolvedValue("");
        mocks.upload.mockResolvedValue(null);
        // cmdk scrolls the selected item into view; jsdom has no implementation
        Element.prototype.scrollIntoView = vi.fn();
    });

    describe("rendering", () => {
        it("renders the page-object fields for a saved draft", () => {
            renderMenu();

            expect(postUrlInput()).toHaveValue("my-post");
            // drafts fall back to the current date/time (Ember gh-date-time-picker)
            expect(screen.getByLabelText<HTMLInputElement>("Date Picker").value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(screen.getByLabelText<HTMLInputElement>("Time Picker").value).toMatch(/^\d{2}:\d{2}$/);
            expect(excerptField()).toHaveValue("");
            expect(screen.getByRole("button", { name: "Tags" })).toBeInTheDocument();
            expect(document.querySelector('[data-test-button="delete-post"]')).not.toBeNull();
        });

        it("shows the saved publish date and time in the site timezone for a published post", () => {
            renderMenu(makeSnapshot({ status: "published", publishedAt: "2026-01-05T10:30:00.000Z" }));

            expect(screen.getByLabelText("Date Picker")).toHaveValue("2026-01-05");
            expect(screen.getByLabelText("Time Picker")).toHaveValue("10:30");
        });

        it("hides the delete button for a new unsaved post", () => {
            renderMenu(makeSnapshot({ id: null, slug: "" }));

            expect(document.querySelector('[data-test-button="delete-post"]')).toBeNull();
        });

        it("uses the Page URL label for pages", () => {
            renderMenu(makeSnapshot(), "pages");

            expect(screen.getByRole("textbox", { name: "Page URL" })).toHaveValue("my-post");
        });
    });

    describe("post URL", () => {
        it("persists an edited slug via the slug generator on blur", async () => {
            mocks.generateSlug.mockResolvedValue("custom-slug");
            renderMenu();

            fireEvent.change(postUrlInput(), { target: { value: "Custom Slug" } });
            fireEvent.blur(postUrlInput());

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(mocks.generateSlug).toHaveBeenCalledWith({ type: "post", text: "Custom Slug", modelId: "post-1" });
            expect(lastEditedPost().slug).toBe("custom-slug");
            await waitFor(() => {
                expect(postUrlInput()).toHaveValue("custom-slug");
            });
        });

        it("resets the input and skips the save when the slug is unchanged", async () => {
            renderMenu();

            fireEvent.change(postUrlInput(), { target: { value: "   " } });
            fireEvent.blur(postUrlInput());

            await waitFor(() => {
                expect(postUrlInput()).toHaveValue("my-post");
            });
            expect(mocks.generateSlug).not.toHaveBeenCalled();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });
    });

    describe("publish date", () => {
        it("saves a backdated publish date for a published post", async () => {
            renderMenu(makeSnapshot({ status: "published", publishedAt: "2026-01-05T10:30:00.000Z" }));

            fireEvent.change(screen.getByLabelText("Date Picker"), { target: { value: "2026-01-01" } });
            fireEvent.blur(screen.getByLabelText("Date Picker"));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost()).toMatchObject({
                published_at: "2026-01-01T10:30:00.000Z",
                status: "published",
            });
        });

        it("shows a format error for an invalid date and does not save", async () => {
            renderMenu(makeSnapshot({ status: "published", publishedAt: "2026-01-05T10:30:00.000Z" }));

            fireEvent.change(screen.getByLabelText("Date Picker"), { target: { value: "not-a-date" } });
            fireEvent.blur(screen.getByLabelText("Date Picker"));

            expect(await screen.findByText("Invalid date format, must be YYYY-MM-DD")).toBeInTheDocument();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });

        it("rejects a future publish date for published posts (Ember client validation)", async () => {
            renderMenu(makeSnapshot({ status: "published", publishedAt: "2026-01-05T10:30:00.000Z" }));

            fireEvent.change(screen.getByLabelText("Date Picker"), { target: { value: "2999-01-01" } });
            fireEvent.blur(screen.getByLabelText("Date Picker"));

            expect(await screen.findByText("Please choose a past date and time.")).toBeInTheDocument();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });

        it("saves an edited publish time on blur", async () => {
            renderMenu(makeSnapshot({ status: "published", publishedAt: "2026-01-05T10:30:00.000Z" }));

            fireEvent.change(screen.getByLabelText("Time Picker"), { target: { value: "8:15" } });
            fireEvent.blur(screen.getByLabelText("Time Picker"));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            // 8:15 is padded to 08:15 (Ember setTimeInternal)
            expect(lastEditedPost().published_at).toBe("2026-01-05T08:15:00.000Z");
        });

        it("disables the date fields for scheduled posts and points at the publish menu", () => {
            renderMenu(makeSnapshot({ status: "scheduled", publishedAt: "2999-01-01T10:00:00.000Z" }));

            expect(screen.getByLabelText("Date Picker")).toBeDisabled();
            expect(screen.getByLabelText("Time Picker")).toBeDisabled();
            expect(screen.getByText("Use the publish menu to re-schedule")).toBeInTheDocument();
        });
    });

    describe("excerpt", () => {
        it("dispatches edits into the excerpt scratch and saves on blur", async () => {
            renderMenu();

            fireEvent.change(excerptField(), { target: { value: "A short summary" } });
            expect(excerptField()).toHaveValue("A short summary");
            fireEvent.blur(excerptField());

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().custom_excerpt).toBe("A short summary");
        });

        it("does not save when the excerpt is unchanged", () => {
            renderMenu();

            fireEvent.blur(excerptField());

            expect(mocks.editPost).not.toHaveBeenCalled();
        });

        it("rejects excerpts longer than 300 characters", async () => {
            renderMenu();

            fireEvent.change(excerptField(), { target: { value: "x".repeat(301) } });
            fireEvent.blur(excerptField());

            expect(await screen.findByText("Excerpt cannot be longer than 300 characters.")).toBeInTheDocument();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });
    });

    describe("tags", () => {
        it("adds an existing tag and saves it with the post", async () => {
            renderMenu();

            fireEvent.click(screen.getByRole("button", { name: "Tags" }));
            fireEvent.click(await screen.findByText("News"));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().tags).toEqual([{ name: "News" }]);
        });

        it("offers creating a tag that does not exist yet", async () => {
            renderMenu();

            fireEvent.click(screen.getByRole("button", { name: "Tags" }));
            fireEvent.change(await screen.findByPlaceholderText("Search tags"), { target: { value: "Brand New" } });
            fireEvent.click(await screen.findByText(/Create/));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().tags).toEqual([{ name: "Brand New" }]);
        });
    });

    describe("feature image", () => {
        it("uploads a file and saves the returned url", async () => {
            mocks.upload.mockResolvedValue([{ url: "https://cdn.example.com/cover.png", fileName: "cover.png" }]);
            renderMenu();

            const file = new File(["binary"], "cover.png", { type: "image/png" });
            fireEvent.change(screen.getByTestId("feature-image-file-input"), { target: { files: [file] } });

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().feature_image).toBe("https://cdn.example.com/cover.png");
            expect(await screen.findByAltText("Feature")).toHaveAttribute("src", "https://cdn.example.com/cover.png");
        });

        it("removes the image and saves null", async () => {
            renderMenu(makeSnapshot({ featureImage: "https://cdn.example.com/cover.png" }));

            fireEvent.click(screen.getByTestId("remove-feature-image"));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().feature_image).toBeNull();
        });
    });

    describe("delete", () => {
        it("deletes the post after confirmation and navigates back to the list", async () => {
            mocks.deletePost.mockResolvedValue({});
            renderMenu();

            fireEvent.click(document.querySelector('[data-test-button="delete-post"]') as HTMLElement);
            const confirmButton = await waitFor(() => {
                const element = document.querySelector('[data-test-button="delete-post-confirm"]');
                expect(element).not.toBeNull();
                return element as HTMLElement;
            });
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mocks.deletePost).toHaveBeenCalledWith("post-1");
            });
            await waitFor(() => {
                expect(mocks.navigate).toHaveBeenCalledWith("/posts");
            });
        });

        it("deletes pages via the bulk endpoint and navigates to /pages", async () => {
            mocks.bulkDelete.mockResolvedValue({});
            renderMenu(makeSnapshot({ id: "page-1" }), "pages");

            fireEvent.click(document.querySelector('[data-test-button="delete-post"]') as HTMLElement);
            const confirmButton = await waitFor(() => {
                const element = document.querySelector('[data-test-button="delete-post-confirm"]');
                expect(element).not.toBeNull();
                return element as HTMLElement;
            });
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mocks.bulkDelete).toHaveBeenCalledWith({ filter: "id:'page-1'", resource: "pages" });
            });
            await waitFor(() => {
                expect(mocks.navigate).toHaveBeenCalledWith("/pages");
            });
            expect(mocks.deletePost).not.toHaveBeenCalled();
        });
    });
});
