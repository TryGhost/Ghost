import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
    AddEditorPostPayload,
    EditEditorPostPayload,
    EditorPagesResponseType,
    EditorPostsResponseType,
    EditorResourceResponseType,
    FullPost,
} from "@tryghost/admin-x-framework/api/editor";
import type { User } from "@tryghost/admin-x-framework/api/users";
import { getEditorAccessRedirect } from "./editor-access";
import type { EditorKoenigProps } from "./editor-koenig";
import { EditorScreen } from "./editor-screen";
import { BLANK_LEXICAL } from "./use-editor";

type QueryResult<Data> = { data?: Data; error: unknown; isLoading: boolean };

const mocks = vi.hoisted(() => ({
    addPost: vi.fn<(payload: AddEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    editPost: vi.fn<(payload: EditEditorPostPayload) => Promise<EditorResourceResponseType>>(),
    generateSlug: vi.fn<() => Promise<string>>(),
    params: vi.fn<() => Record<string, string>>(() => ({})),
    postQuery: vi.fn<() => QueryResult<EditorPostsResponseType>>(),
    pageQuery: vi.fn<() => QueryResult<EditorPagesResponseType>>(),
    currentUser: vi.fn<() => unknown>(() => undefined),
    crossShellNavigate: vi.fn<(route: string, options?: { replace?: boolean }) => void>(),
    koenigProps: { current: null as EditorKoenigProps | null },
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
        <a href={`#${to}`} {...rest}>{children}</a>
    ),
    useParams: () => mocks.params(),
    useBlocker: () => ({ state: "unblocked", proceed: vi.fn(), reset: vi.fn() }),
    useConfirmUnload: () => {},
}));

vi.mock("@tryghost/admin-x-framework/api/current-user", () => ({
    usersDataType: "UsersResponseType",
    useCurrentUser: () => ({ data: mocks.currentUser() }),
}));

vi.mock("@/utils/cross-shell-navigate", () => ({
    crossShellNavigate: mocks.crossShellNavigate,
}));

vi.mock("@tryghost/admin-x-framework/api/editor", () => ({
    getEditorPost: () => mocks.postQuery(),
    getEditorPage: () => mocks.pageQuery(),
    useAddEditorPost: () => ({ mutateAsync: mocks.addPost }),
    useEditEditorPost: () => ({ mutateAsync: mocks.editPost }),
}));

vi.mock("@tryghost/admin-x-framework/api/slugs", () => ({
    useGenerateSlug: () => ({ generateSlug: mocks.generateSlug }),
}));

// Koenig is loaded dynamically from a real ESM bundle; replace it with a
// stub that records its props so tests can drive onChange/registerAPI.
vi.mock("./editor-koenig", () => ({
    EditorKoenig: (props: EditorKoenigProps) => {
        mocks.koenigProps.current = props;
        return <div data-kg="editor" data-testid="mock-koenig" />;
    },
}));

// The settings menu pulls in its own framework hooks (tags, settings, delete,
// uploads); it has dedicated tests in settings-menu/settings-menu.test.tsx.
vi.mock("./settings-menu/settings-menu", () => ({
    SettingsMenu: () => <div data-testid="mock-settings-menu" />,
}));

// The canvas feature image pulls in the framework uploader; it has dedicated
// tests in feature-image.test.tsx.
vi.mock("./feature-image", () => ({
    EditorFeatureImage: () => <div data-testid="mock-feature-image" />,
}));

// The publish controls pull in their own framework hooks (settings, config,
// newsletters, members, current user); they have dedicated tests in
// publish/publish-management.test.tsx and publish/publish-flow-modal.test.tsx.
vi.mock("./publish/publish-management", () => ({
    PublishManagement: () => (
        <button data-test-button="publish-flow" type="button">Publish</button>
    ),
}));

// EditorPostStatus renders for real (these tests assert the status text) but
// its timezone hook reads settings via the framework, so stub the data hooks.
vi.mock("./publish/use-publish-data", () => ({
    useSiteTimezone: () => "Etc/UTC",
    usePublishOptionsInput: () => null,
}));

function makeFullPost(overrides: Partial<FullPost> = {}): FullPost {
    return {
        id: "post-1",
        uuid: "uuid-1",
        title: "My post",
        slug: "my-post",
        lexical: '{"root":{"children":[],"direction":null,"type":"root","version":1}}',
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

function makeUser(role: string, id = "user-1"): User {
    return { id, roles: [{ id: `role-${role}`, name: role }] } as unknown as User;
}

function titleInput(): HTMLTextAreaElement {
    const element = document.querySelector("[data-test-editor-title-input]");
    expect(element).not.toBeNull();
    return element as HTMLTextAreaElement;
}

function postStatus(): HTMLElement {
    const element = document.querySelector("[data-test-editor-post-status]");
    expect(element).not.toBeNull();
    return element as HTMLElement;
}

describe("EditorScreen", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.params.mockReturnValue({});
        mocks.postQuery.mockReturnValue({ data: undefined, error: null, isLoading: true });
        mocks.pageQuery.mockReturnValue({ data: undefined, error: null, isLoading: true });
        mocks.generateSlug.mockResolvedValue("");
        mocks.currentUser.mockReturnValue(makeUser("Administrator"));
        mocks.koenigProps.current = null;
        window.location.hash = "#/editor/post";
    });

    describe("new post", () => {
        it("renders the title input, koenig editor, status and settings toggle", () => {
            render(<EditorScreen resource="posts" />);

            expect(titleInput()).toHaveValue("");
            expect(titleInput()).toHaveAttribute("placeholder", "Post title");
            expect(screen.getByTestId("mock-koenig")).toBeInTheDocument();
            expect(postStatus()).toHaveTextContent("New");
            expect(screen.getByTestId("settings-menu-toggle")).toBeInTheDocument();
            // no publish button until the post exists (mirrors Ember)
            expect(document.querySelector('[data-test-button="publish-flow"]')).toBeNull();
        });

        it("creates the post on the first body change and swaps the URL without remounting", async () => {
            const created = makeFullPost({ id: "new-id", title: "(Untitled)" });
            mocks.addPost.mockResolvedValue({ posts: [created] });
            const replaceState = vi.spyOn(window.history, "replaceState");

            render(<EditorScreen resource="posts" />);

            act(() => {
                mocks.koenigProps.current!.onChange('{"root":{"children":[{"children":[{"text":"hi","type":"text"}],"type":"paragraph","version":1}],"type":"root","version":1}}');
            });

            await waitFor(() => {
                expect(mocks.addPost).toHaveBeenCalledTimes(1);
            });
            await waitFor(() => {
                expect(replaceState).toHaveBeenCalled();
            });

            const url = replaceState.mock.calls.at(-1)?.[2];
            expect(String(url)).toContain("#/editor/post/new-id");
            // the publish button placeholder appears once the post exists
            expect(document.querySelector('[data-test-button="publish-flow"]')).not.toBeNull();
        });

        // Regression for the broken create-on-title-typing flow: the save
        // directive must fire from typing alone (no blur, no body edit) and
        // must survive StrictMode double-rendering without being dropped or
        // duplicated (effects derived inside a reducer would be).
        it("creates the post exactly once when typing a title under StrictMode", async () => {
            const created = makeFullPost({ id: "new-id", title: "Hello", lexical: BLANK_LEXICAL });
            mocks.addPost.mockResolvedValue({ posts: [created] });
            const replaceState = vi.spyOn(window.history, "replaceState");

            render(
                <StrictMode>
                    <EditorScreen resource="posts" />
                </StrictMode>,
            );

            fireEvent.change(titleInput(), { target: { value: "Hello" } });

            await waitFor(() => {
                expect(postStatus()).toHaveTextContent("Draft - Saved");
            });
            expect(mocks.addPost).toHaveBeenCalledTimes(1);
            expect(mocks.addPost.mock.calls[0][0].post.title).toBe("Hello");
            expect(String(replaceState.mock.calls.at(-1)?.[2])).toContain("#/editor/post/new-id");
        });

        // Ember maps the saved "(Untitled)" default back to an empty input
        // (gh-koenig-editor-lexical.js); without it the first autosave of an
        // untitled post injected the literal "(Untitled)" into the visible
        // title and further typing appended to it
        it("keeps the title input empty after the first autosave of an untitled post", async () => {
            const bodyDoc = '{"root":{"children":[{"children":[{"text":"hi","type":"text"}],"type":"paragraph","version":1}],"type":"root","version":1}}';
            mocks.addPost.mockResolvedValue({
                posts: [makeFullPost({ id: "new-id", title: "(Untitled)", slug: "untitled", lexical: bodyDoc })],
            });

            render(<EditorScreen resource="posts" />);

            act(() => {
                mocks.koenigProps.current!.onChange(bodyDoc);
            });
            await waitFor(() => {
                expect(postStatus()).toHaveTextContent("Draft - Saved");
            });

            expect(titleInput()).toHaveValue("");

            // typing afterwards must not append to the injected default
            fireEvent.change(titleInput(), { target: { value: "Hello" } });
            expect(titleInput()).toHaveValue("Hello");
        });

        // Ember's global `textarea { max-width: 500px }` leaks into the
        // editor portal; the explicit utility keeps the title on the same
        // content column as the Koenig body
        it("does not cap the title column below the body width", () => {
            render(<EditorScreen resource="posts" />);

            expect(titleInput()).toHaveClass("w-full", "max-w-none");
        });

        it("covers the viewport and hides the admin shell from the accessibility tree while open", () => {
            const appRoot = document.createElement("div");
            appRoot.id = "root";
            document.body.appendChild(appRoot);
            try {
                const { unmount } = render(<EditorScreen resource="posts" />);

                expect(document.querySelector("[data-test-editor]")).toHaveClass("fixed", "inset-0", "z-50", "bg-white");
                expect(appRoot).toHaveAttribute("inert");
                expect(appRoot).toHaveAttribute("aria-hidden", "true");

                unmount();
                expect(appRoot).not.toHaveAttribute("inert");
                expect(appRoot).not.toHaveAttribute("aria-hidden");
            } finally {
                appRoot.remove();
            }
        });
    });

    describe("existing post", () => {
        beforeEach(() => {
            mocks.params.mockReturnValue({ postId: "post-1" });
            mocks.postQuery.mockReturnValue({
                data: { posts: [makeFullPost()] },
                error: null,
                isLoading: false,
            });
        });

        it("loads the post into the editor", () => {
            render(<EditorScreen resource="posts" />);

            expect(titleInput()).toHaveValue("My post");
            expect(postStatus()).toHaveTextContent("Draft - Saved");
            expect(mocks.koenigProps.current?.initialEditorState).toBe(makeFullPost().lexical);
        });

        it("marks the post dirty when the title changes", () => {
            render(<EditorScreen resource="posts" />);

            fireEvent.change(titleInput(), { target: { value: "Renamed post" } });

            expect(postStatus()).toHaveTextContent("Draft");
            expect(postStatus()).not.toHaveTextContent("Saved");
        });

        it("saves the renamed draft on title blur", async () => {
            mocks.editPost.mockResolvedValue({ posts: [makeFullPost({ title: "Renamed post" })] });
            render(<EditorScreen resource="posts" />);

            fireEvent.change(titleInput(), { target: { value: "Renamed post" } });
            fireEvent.blur(titleInput());

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledTimes(1);
            });
            expect(mocks.editPost.mock.calls[0][0].post.title).toBe("Renamed post");
            await waitFor(() => {
                expect(postStatus()).toHaveTextContent("Draft - Saved");
            });
        });

        it("focuses the koenig editor when pressing Enter in the title", () => {
            const focusEditor = vi.fn();
            render(<EditorScreen resource="posts" />);
            mocks.koenigProps.current!.registerAPI({ focusEditor });

            fireEvent.keyDown(titleInput(), { key: "Enter" });

            expect(focusEditor).toHaveBeenCalledWith({ position: "top" });
        });

        it("opens the settings sheet with the settings menu from the toggle button", async () => {
            render(<EditorScreen resource="posts" />);

            fireEvent.click(screen.getByTestId("settings-menu-toggle"));

            expect(await screen.findByText("Post settings")).toBeInTheDocument();
            expect(screen.getByTestId("mock-settings-menu")).toBeInTheDocument();
        });

        // Ember gh-post-settings-menu publishes the open panel's width as CSS
        // vars so Koenig's wide/full breakout cards shrink instead of sliding
        // under the panel (and reset when it closes)
        it("publishes the settings panel width as the editor sidebar / breakout CSS vars", () => {
            const getBoundingClientRect = vi
                .spyOn(Element.prototype, "getBoundingClientRect")
                .mockReturnValue({ width: 419 } as DOMRect);
            try {
                render(<EditorScreen resource="posts" />);
                const rootStyle = document.documentElement.style;

                fireEvent.click(screen.getByTestId("settings-menu-toggle"));
                expect(rootStyle.getPropertyValue("--editor-sidebar-width")).toBe("419px");
                expect(rootStyle.getPropertyValue("--kg-breakout-adjustment")).toBe("419px");

                fireEvent.click(screen.getByTestId("settings-menu-toggle"));
                expect(rootStyle.getPropertyValue("--editor-sidebar-width")).toBe("0px");
                expect(rootStyle.getPropertyValue("--kg-breakout-adjustment")).toBe("0px");
            } finally {
                getBoundingClientRect.mockRestore();
            }
        });

        it("converts mobiledoc posts to lexical via the convert_to_lexical save", async () => {
            const mobiledocPost = makeFullPost({ lexical: null, mobiledoc: '{"version":"0.3.1"}' });
            const converted = makeFullPost({ lexical: '{"root":{"children":[],"type":"root","version":1}}' });
            mocks.postQuery.mockReturnValue({ data: { posts: [mobiledocPost] }, error: null, isLoading: false });
            mocks.editPost.mockResolvedValue({ posts: [converted] });

            render(<EditorScreen resource="posts" />);

            await waitFor(() => {
                expect(mocks.editPost).toHaveBeenCalledWith({
                    id: "post-1",
                    post: { updated_at: mobiledocPost.updated_at },
                    resource: "posts",
                    convertToLexical: true,
                });
            });
            await waitFor(() => {
                expect(titleInput()).toHaveValue("My post");
            });
        });
    });

    describe("permissions gate (Ember edit route afterModel)", () => {
        function loadPostWithAuthors(authorIds: string[], overrides: Partial<FullPost> = {}) {
            mocks.params.mockReturnValue({ postId: "post-1" });
            mocks.postQuery.mockReturnValue({
                data: {
                    posts: [makeFullPost({
                        authors: authorIds.map(id => ({ id, name: `Author ${id}`, slug: id })),
                        ...overrides,
                    })],
                },
                error: null,
                isLoading: false,
            });
        }

        it("redirects a contributor away from someone else's post without rendering the editor", () => {
            mocks.currentUser.mockReturnValue(makeUser("Contributor", "me"));
            loadPostWithAuthors(["someone-else"]);

            render(<EditorScreen resource="posts" />);

            expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/posts", { replace: true });
            expect(document.querySelector("[data-test-editor]")).toBeNull();
            // the forbidden post is never loaded into the machine
            expect(document.querySelector("[data-test-editor-title-input]")).toBeNull();
        });

        it("redirects a contributor away from their own published post", () => {
            mocks.currentUser.mockReturnValue(makeUser("Contributor", "me"));
            loadPostWithAuthors(["me"], { status: "published" });

            render(<EditorScreen resource="posts" />);

            expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/posts", { replace: true });
        });

        it("lets a contributor open their own draft", () => {
            mocks.currentUser.mockReturnValue(makeUser("Contributor", "me"));
            loadPostWithAuthors(["me"], { status: "draft" });

            render(<EditorScreen resource="posts" />);

            expect(mocks.crossShellNavigate).not.toHaveBeenCalled();
            expect(titleInput()).toHaveValue("My post");
        });

        it("redirects an author away from someone else's post, targeting /pages for pages", () => {
            mocks.currentUser.mockReturnValue(makeUser("Author", "me"));
            mocks.params.mockReturnValue({ postId: "page-1" });
            mocks.pageQuery.mockReturnValue({
                data: {
                    pages: [makeFullPost({
                        id: "page-1",
                        status: "published",
                        authors: [{ id: "someone-else", name: "Someone", slug: "someone" }],
                    })],
                },
                error: null,
                isLoading: false,
            });

            render(<EditorScreen resource="pages" />);

            expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/pages", { replace: true });
        });

        it("lets an author open their own published post", () => {
            mocks.currentUser.mockReturnValue(makeUser("Author", "me"));
            loadPostWithAuthors(["me"], { status: "published" });

            render(<EditorScreen resource="posts" />);

            expect(mocks.crossShellNavigate).not.toHaveBeenCalled();
            expect(titleInput()).toHaveValue("My post");
        });
    });

    describe("pages", () => {
        it("uses the pages query, placeholder and back link", () => {
            mocks.params.mockReturnValue({ postId: "page-1" });
            mocks.pageQuery.mockReturnValue({
                data: { pages: [makeFullPost({ id: "page-1", title: "My page" })] },
                error: null,
                isLoading: false,
            });

            render(<EditorScreen resource="pages" />);

            expect(titleInput()).toHaveValue("My page");
            expect(titleInput()).toHaveAttribute("placeholder", "Page title");
            expect(screen.getByRole("link", { name: /Pages/ })).toHaveAttribute("href", "#/pages");
        });
    });
});

describe("getEditorAccessRedirect", () => {
    const authors = (ids: string[]) => ids.map(id => ({ id, name: `Author ${id}`, slug: id }));

    it("returns null while the user or post is still loading", () => {
        expect(getEditorAccessRedirect(undefined, makeFullPost(), "posts")).toBeNull();
        expect(getEditorAccessRedirect(makeUser("Contributor"), undefined, "posts")).toBeNull();
    });

    it("allows admins and editors regardless of authorship or status", () => {
        const post = makeFullPost({ status: "published", authors: authors(["someone-else"]) });
        expect(getEditorAccessRedirect(makeUser("Administrator", "me"), post, "posts")).toBeNull();
        expect(getEditorAccessRedirect(makeUser("Editor", "me"), post, "posts")).toBeNull();
        expect(getEditorAccessRedirect(makeUser("Owner", "me"), post, "posts")).toBeNull();
    });

    it("redirects authors and contributors away from posts they don't author", () => {
        const post = makeFullPost({ status: "draft", authors: authors(["someone-else"]) });
        expect(getEditorAccessRedirect(makeUser("Author", "me"), post, "posts")).toBe("/posts");
        expect(getEditorAccessRedirect(makeUser("Contributor", "me"), post, "posts")).toBe("/posts");
        // missing authors behaves like not-authored
        expect(getEditorAccessRedirect(makeUser("Author", "me"), makeFullPost({ authors: undefined }), "posts")).toBe("/posts");
    });

    it("redirects contributors away from their own non-draft posts", () => {
        for (const status of ["published", "scheduled", "sent"]) {
            const post = makeFullPost({ status, authors: authors(["me"]) });
            expect(getEditorAccessRedirect(makeUser("Contributor", "me"), post, "posts")).toBe("/posts");
        }
    });

    it("allows contributors on their own drafts and authors on all their own posts", () => {
        expect(getEditorAccessRedirect(
            makeUser("Contributor", "me"),
            makeFullPost({ status: "draft", authors: authors(["me"]) }),
            "posts",
        )).toBeNull();
        expect(getEditorAccessRedirect(
            makeUser("Author", "me"),
            makeFullPost({ status: "published", authors: authors(["me", "co-author"]) }),
            "posts",
        )).toBeNull();
    });

    it("mirrors Ember's redirect target per resource", () => {
        const post = makeFullPost({ status: "published", authors: authors(["someone-else"]) });
        expect(getEditorAccessRedirect(makeUser("Contributor", "me"), post, "posts")).toBe("/posts");
        expect(getEditorAccessRedirect(makeUser("Contributor", "me"), post, "pages")).toBe("/pages");
    });
});
