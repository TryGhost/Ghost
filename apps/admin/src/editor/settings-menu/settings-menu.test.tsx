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
import { createDefaultPostSettings, type PostSnapshot } from "@/editor/state";
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
    users: [
        { id: "user-1", name: "Admin User", roles: [{ id: "role-1", name: "Administrator" }] },
        { id: "user-2", name: "Second Author", roles: [{ id: "role-2", name: "Author" }] },
    ],
    currentUserRole: { value: "Administrator" },
    tiers: [
        { id: "tier-1", name: "Bronze", active: true, type: "paid" },
        { id: "tier-2", name: "Silver", active: true, type: "paid" },
    ],
    themeTemplates: {
        value: [
            { filename: "custom-full-feature-image", name: "Full feature image", for: ["page", "post"], slug: null },
            { filename: "custom-about", name: "About", for: ["page", "post"], slug: "about" },
        ] as Array<{ filename: string; name?: string; for?: string[]; slug?: string | null }>,
    },
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

vi.mock("@tryghost/admin-x-framework/api/current-user", () => ({
    useCurrentUser: () => ({
        data: {
            id: "user-1",
            name: "Admin User",
            roles: [{ id: "role-1", name: mocks.currentUserRole.value }],
        },
    }),
}));

vi.mock("@tryghost/admin-x-framework/api/users", () => ({
    useBrowseUsers: () => ({ data: { users: mocks.users } }),
    isContributorUser: (user: { roles?: Array<{ name: string }> }) => {
        return user.roles?.some(role => role.name === "Contributor") ?? false;
    },
    isAuthorOrContributor: (user: { roles?: Array<{ name: string }> }) => {
        return user.roles?.some(role => ["Author", "Contributor"].includes(role.name)) ?? false;
    },
}));

vi.mock("@tryghost/admin-x-framework/api/tiers", () => ({
    useBrowseTiers: () => ({ data: { tiers: mocks.tiers } }),
}));

vi.mock("@tryghost/admin-x-framework/api/themes", () => ({
    useActiveTheme: () => ({
        data: { themes: [{ active: true, name: "casper", package: {}, templates: mocks.themeTemplates.value }] },
    }),
}));

// CodeEditor lazy-loads CodeMirror; a plain textarea keeps the tests fast
// and lets us drive change/blur like the real component
vi.mock("@tryghost/admin-x-design-system", () => ({
    CodeEditor: ({ value, onChange, onBlur, ...props }: {
        value?: string;
        onChange?: (value: string) => void;
        onBlur?: () => void;
        "data-testid"?: string;
    }) => (
        <textarea
            data-testid={props["data-testid"]}
            value={value}
            onBlur={onBlur}
            onChange={event => onChange?.(event.target.value)}
        />
    ),
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
        settings: {
            ...createDefaultPostSettings(),
            visibility: "public",
            authors: [{ id: "user-1", name: "Admin User" }],
        },
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
        mocks.currentUserRole.value = "Administrator";
        // cmdk scrolls the selected item into view; jsdom has no implementation
        Element.prototype.scrollIntoView = vi.fn();
        // radix-ui Select uses the pointer-capture API which jsdom lacks
        Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
        Element.prototype.setPointerCapture = vi.fn();
        Element.prototype.releasePointerCapture = vi.fn();
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

    describe("visibility", () => {
        function visibilityTrigger(): HTMLElement {
            const element = document.querySelector('[data-test-select="post-visibility"]');
            expect(element).not.toBeNull();
            return element as HTMLElement;
        }

        it("shows the saved visibility and saves a change immediately", async () => {
            renderMenu();
            expect(visibilityTrigger()).toHaveTextContent("Public");

            fireEvent.click(visibilityTrigger());
            fireEvent.click(await screen.findByRole("option", { name: "Members only" }));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost()).toMatchObject({ visibility: "members", tiers: [] });
        });

        it("defers the save for specific tiers until a tier is selected", async () => {
            renderMenu();

            fireEvent.click(visibilityTrigger());
            fireEvent.click(await screen.findByRole("option", { name: "Specific tier(s)" }));

            // no save without tiers; the inline error explains why
            expect(mocks.editPost).not.toHaveBeenCalled();
            expect(screen.getByText("Please select at least one tier")).toBeInTheDocument();

            // let the closed Select finish its async focus-return before
            // opening the popover (it would otherwise close it again)
            await new Promise(resolve => setTimeout(resolve, 0));

            fireEvent.click(screen.getByTestId("psm-tiers"));
            fireEvent.click(await screen.findByText("Bronze"));
            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost()).toMatchObject({ visibility: "tiers", tiers: [{ id: "tier-1" }] });
        });
    });

    describe("authors", () => {
        it("adds an author and saves immediately", async () => {
            renderMenu();

            fireEvent.click(screen.getByTestId("psm-authors-input"));
            fireEvent.click(await screen.findByText("Second Author"));

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().authors).toEqual([{ id: "user-1" }, { id: "user-2" }]);
        });

        it("refuses to remove the last author", async () => {
            renderMenu();

            fireEvent.click(screen.getByTestId("psm-authors-input"));
            fireEvent.click(await screen.findByRole("option", { name: "Admin User" }));

            expect(await screen.findByText("At least one author is required.")).toBeInTheDocument();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });
    });

    describe("template", () => {
        function templateTrigger(): HTMLElement {
            const element = document.querySelector('[data-test-select="custom-template"]');
            expect(element).not.toBeNull();
            return element as HTMLElement;
        }

        it("selects a custom template without saving immediately (Ember parity) and sends it with the next save", async () => {
            renderMenu();

            fireEvent.click(templateTrigger());
            fireEvent.click(await screen.findByRole("option", { name: "Full feature image" }));

            // template changes ride along with the next save, like Ember's mut
            expect(mocks.editPost).not.toHaveBeenCalled();

            fireEvent.change(excerptField(), { target: { value: "Trigger a save" } });
            fireEvent.blur(excerptField());

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().custom_template).toBe("custom-full-feature-image");
        });

        it("is hidden when the active theme has no custom templates", () => {
            mocks.themeTemplates.value = [];
            renderMenu();

            expect(document.querySelector('[data-test-custom-template-form]')).toBeNull();
            mocks.themeTemplates.value = [
                { filename: "custom-full-feature-image", name: "Full feature image", for: ["page", "post"], slug: null },
                { filename: "custom-about", name: "About", for: ["page", "post"], slug: "about" },
            ];
        });

        it("disables the select when the slug matches a slug template", () => {
            renderMenu(makeSnapshot({ slug: "about" }));

            expect(templateTrigger()).toBeDisabled();
            expect(screen.getByText("Post URL matches custom-about")).toBeInTheDocument();
        });
    });

    describe("toggles", () => {
        it("features the post and saves immediately", async () => {
            renderMenu();

            const toggle = document.querySelector('[data-test-checkbox="featured"]');
            expect(toggle).not.toBeNull();
            fireEvent.click(toggle as HTMLElement);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().featured).toBe(true);
        });

        it("shows the show-title-and-feature-image toggle for pages with lexical content only", () => {
            renderMenu(makeSnapshot({ lexical: "{}" }), "pages");
            expect(document.querySelector('[data-test-checkbox="hide-title-and-feature-image"]')).not.toBeNull();
        });

        it("hides the show-title-and-feature-image toggle for posts", () => {
            renderMenu(makeSnapshot({ lexical: "{}" }));
            expect(document.querySelector('[data-test-checkbox="hide-title-and-feature-image"]')).toBeNull();
        });

        it("saves the show-title-and-feature-image toggle for pages", async () => {
            renderMenu(makeSnapshot({
                lexical: "{}",
                settings: { ...makeSnapshot().settings, showTitleAndFeatureImage: true },
            }), "pages");

            fireEvent.click(document.querySelector('[data-test-checkbox="hide-title-and-feature-image"]') as HTMLElement);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().show_title_and_feature_image).toBe(false);
        });
    });

    describe("meta data", () => {
        function expandMetaData() {
            fireEvent.click(screen.getByTestId("psm-meta-data"));
        }

        it("saves an edited meta title on blur", async () => {
            renderMenu();
            expandMetaData();

            const field = document.querySelector('[data-test-field="meta-title"]') as HTMLInputElement;
            fireEvent.change(field, { target: { value: "SEO title" } });
            fireEvent.blur(field);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().meta_title).toBe("SEO title");
        });

        it("saves an edited meta description on blur", async () => {
            renderMenu();
            expandMetaData();

            const field = document.querySelector('[data-test-field="meta-description"]') as HTMLTextAreaElement;
            fireEvent.change(field, { target: { value: "SEO description" } });
            fireEvent.blur(field);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().meta_description).toBe("SEO description");
        });

        it("rejects an invalid canonical URL and does not save", async () => {
            renderMenu();
            expandMetaData();

            const field = document.querySelector('[data-test-field="canonicalUrl"]') as HTMLInputElement;
            fireEvent.change(field, { target: { value: "not a url" } });
            fireEvent.blur(field);

            expect(await screen.findByText("Please enter a valid URL")).toBeInTheDocument();
            expect(mocks.editPost).not.toHaveBeenCalled();
        });

        it("saves a valid canonical URL on blur", async () => {
            renderMenu();
            expandMetaData();

            const field = document.querySelector('[data-test-field="canonicalUrl"]') as HTMLInputElement;
            fireEvent.change(field, { target: { value: "https://example.com/canonical" } });
            fireEvent.blur(field);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().canonical_url).toBe("https://example.com/canonical");
        });
    });

    describe("social cards", () => {
        it("saves the X card title and description on blur", async () => {
            renderMenu();
            fireEvent.click(screen.getByTestId("psm-x-card"));

            const title = document.querySelector('[data-test-field="twitter-title"]') as HTMLInputElement;
            fireEvent.change(title, { target: { value: "X title" } });
            fireEvent.blur(title);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().twitter_title).toBe("X title");
        });

        it("uploads a Facebook image and saves the returned url", async () => {
            mocks.upload.mockResolvedValue([{ url: "https://cdn.example.com/og.png", fileName: "og.png" }]);
            renderMenu();
            fireEvent.click(screen.getByTestId("psm-facebook-card"));

            const file = new File(["binary"], "og.png", { type: "image/png" });
            fireEvent.change(screen.getByTestId("og-image-file-input"), { target: { files: [file] } });

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().og_image).toBe("https://cdn.example.com/og.png");
        });
    });

    describe("code injection", () => {
        it("saves the header injection on blur", async () => {
            renderMenu();
            fireEvent.click(screen.getByTestId("psm-code-injection"));

            const editorField = await screen.findByTestId("codeinjection-head-editor");
            fireEvent.change(editorField, { target: { value: "<style>.x{}</style>" } });
            fireEvent.blur(editorField);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(lastEditedPost().codeinjection_head).toBe("<style>.x{}</style>");
        });

        it("does not save when the code is unchanged", async () => {
            renderMenu();
            fireEvent.click(screen.getByTestId("psm-code-injection"));

            const editorField = await screen.findByTestId("codeinjection-foot-editor");
            fireEvent.blur(editorField);

            expect(mocks.editPost).not.toHaveBeenCalled();
        });
    });

    describe("role gating", () => {
        it("hides tags, visibility, authors and featured for contributors", () => {
            mocks.currentUserRole.value = "Contributor";
            renderMenu();

            expect(screen.queryByRole("button", { name: "Tags" })).toBeNull();
            expect(document.querySelector('[data-test-select="post-visibility"]')).toBeNull();
            expect(screen.queryByTestId("psm-authors")).toBeNull();
            expect(document.querySelector('[data-test-checkbox="featured"]')).toBeNull();
        });

        it("hides visibility, authors and featured (but not tags) for authors", () => {
            mocks.currentUserRole.value = "Author";
            renderMenu();

            expect(screen.getByRole("button", { name: "Tags" })).toBeInTheDocument();
            expect(document.querySelector('[data-test-select="post-visibility"]')).toBeNull();
            expect(screen.queryByTestId("psm-authors")).toBeNull();
            expect(document.querySelector('[data-test-checkbox="featured"]')).toBeNull();
        });
    });
});
