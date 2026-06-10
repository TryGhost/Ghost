import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REVISION_PREFIX, type LocalRevision } from "@/editor/local-revisions";
import { RestoreScreen } from "./restore-screen";

const mocks = vi.hoisted(() => ({
    addPost: vi.fn(),
    crossShellNavigate: vi.fn(),
}));

vi.mock("@tryghost/admin-x-framework/api/editor", () => ({
    useAddEditorPost: () => ({ mutateAsync: mocks.addPost }),
}));

vi.mock("@/utils/cross-shell-navigate", () => ({
    crossShellNavigate: mocks.crossShellNavigate,
}));

function seedRevision(overrides: Partial<LocalRevision> = {}): LocalRevision {
    const revision: LocalRevision = {
        id: "post-1",
        type: "post",
        revisionTimestamp: 1700000000000,
        title: "Recovered post",
        lexical: '{"root":{}}',
        slug: "recovered-post",
        status: "draft",
        excerpt: "A lost piece of writing",
        tags: [{ name: "News" }],
        ...overrides,
    };
    window.localStorage.setItem(
        `${REVISION_PREFIX}-${revision.id}-${revision.revisionTimestamp}`,
        JSON.stringify(revision),
    );
    return revision;
}

describe("RestoreScreen", () => {
    beforeEach(() => {
        window.localStorage.clear();
        mocks.addPost.mockReset();
        mocks.crossShellNavigate.mockReset();
    });

    it("shows an empty state when there are no local revisions", () => {
        render(<RestoreScreen />);

        expect(screen.getByRole("heading", { name: "Restore Posts" })).toBeInTheDocument();
        expect(screen.getByText("No local revisions found.")).toBeInTheDocument();
    });

    it("lists revisions newest first with title, time and excerpt", () => {
        seedRevision({ revisionTimestamp: 1700000000000, title: "Older revision" });
        seedRevision({ revisionTimestamp: 1700000100000, title: "Newer revision", excerpt: "Fresh words" });

        render(<RestoreScreen />);

        const titles = screen.getAllByTestId("restore-post-title").map(el => el.textContent);
        expect(titles).toEqual(["Newer revision", "Older revision"]);
        expect(screen.getByText("Fresh words")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(2);
    });

    it("falls back to '(no title)' for untitled revisions", () => {
        seedRevision({ title: "" });

        render(<RestoreScreen />);

        expect(screen.getByText("(no title)")).toBeInTheDocument();
    });

    it("restores a revision as a new draft and opens it in the editor", async () => {
        const revision = seedRevision({ authors: [{ id: "author-1" }] });
        mocks.addPost.mockResolvedValue({ posts: [{ id: "new-post-id" }] });
        render(<RestoreScreen />);

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        await waitFor(() => expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/editor/post/new-post-id"));
        expect(mocks.addPost).toHaveBeenCalledWith({
            post: {
                title: "(Restored) Recovered post",
                lexical: revision.lexical,
                slug: "recovered-post",
                status: "draft",
                tags: [{ name: "News" }],
                authors: [{ id: "author-1" }],
            },
            resource: "posts",
        });
    });

    it("restores page revisions through the pages endpoint", async () => {
        seedRevision({ type: "page", slug: "" });
        mocks.addPost.mockResolvedValue({ pages: [{ id: "new-page-id" }] });
        render(<RestoreScreen />);

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        await waitFor(() => expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/editor/page/new-page-id"));
        expect(mocks.addPost).toHaveBeenCalledWith(expect.objectContaining({
            // Ember's restore() falls back to 'untitled' for missing slugs
            post: expect.objectContaining({ slug: "untitled" }) as unknown,
            resource: "pages",
        }));
    });

    it("shows an error and re-enables the buttons when the restore fails", async () => {
        seedRevision();
        mocks.addPost.mockRejectedValue(new Error("boom"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        render(<RestoreScreen />);

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Failed to restore post");
        expect(screen.getByRole("button", { name: "Restore" })).toBeEnabled();
        expect(mocks.crossShellNavigate).not.toHaveBeenCalled();
    });
});
