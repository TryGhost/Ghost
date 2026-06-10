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

    it("applies the full serialized revision so the restored draft is not gutted", async () => {
        seedRevision({
            custom_excerpt: "Custom excerpt",
            feature_image: "https://example.com/feature.png",
            featured: true,
            visibility: "tiers",
            tiers: [{ id: "tier-1", name: "Bronze" }],
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
        mocks.addPost.mockResolvedValue({ posts: [{ id: "new-post-id" }] });
        render(<RestoreScreen />);

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        await waitFor(() => expect(mocks.crossShellNavigate).toHaveBeenCalledWith("/editor/post/new-post-id"));
        expect(mocks.addPost).toHaveBeenCalledWith(expect.objectContaining({
            post: expect.objectContaining({
                status: "draft",
                custom_excerpt: "Custom excerpt",
                feature_image: "https://example.com/feature.png",
                featured: true,
                visibility: "tiers",
                tiers: [{ id: "tier-1", name: "Bronze" }],
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
            }) as unknown,
        }));
    });

    it("does not invent fields missing from partial (legacy) revisions", async () => {
        // revisions written before the full-serialization fix only carry the
        // content fields — restoring them must not send undefined/null extras
        seedRevision();
        mocks.addPost.mockResolvedValue({ posts: [{ id: "new-post-id" }] });
        render(<RestoreScreen />);

        fireEvent.click(screen.getByRole("button", { name: "Restore" }));

        await waitFor(() => expect(mocks.addPost).toHaveBeenCalled());
        const { post } = mocks.addPost.mock.calls[0][0] as { post: Record<string, unknown> };
        expect(post).not.toHaveProperty("feature_image");
        expect(post).not.toHaveProperty("visibility");
        expect(post).not.toHaveProperty("custom_template");
        expect(post).not.toHaveProperty("meta_title");
        expect(post).not.toHaveProperty("codeinjection_head");
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
