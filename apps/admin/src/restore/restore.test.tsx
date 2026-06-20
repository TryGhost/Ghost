import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {HttpResponse, http} from "msw";
import {afterEach, beforeEach, describe, expect, it, test as baseTest, vi} from "vitest";
import {TestWrapper} from "@tryghost/admin-x-framework/test/test-utils";
import {serverFixture} from "@test-utils/fixtures/msw";
import RestoreRoute from "./restore";
import type {SetupServer} from "msw/node";

const {mockToastError, mockToastSuccess} = vi.hoisted(() => ({
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn()
}));

vi.mock("@tryghost/shade/components", async (importOriginal) => ({
    ...await importOriginal<typeof import("@tryghost/shade/components")>(),
    toast: {
        error: mockToastError,
        success: mockToastSuccess
    }
}));

const POSTS_API_URL = "/ghost/api/admin/posts/";

const restoreTest = baseTest.extend<{
    server: SetupServer;
}>({
    ...serverFixture
});

function getRestorePostTitle(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-test-id="restore-post-title"]') as HTMLElement;
}

function getRestorePostButton(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-test-id="restore-post-button"]') as HTMLElement;
}

function renderRestoreRoute() {
    return render(
        <TestWrapper>
            <RestoreRoute />
        </TestWrapper>
    );
}

describe("RestoreRoute", () => {
    beforeEach(() => {
        window.localStorage.clear();
        mockToastError.mockClear();
        mockToastSuccess.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders an empty state when there are no local revisions", () => {
        const {container} = renderRestoreRoute();

        expect(screen.getByRole("heading", {name: "Restore Posts"})).toBeInTheDocument();
        expect(screen.getByText("No local revisions found.")).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(container.querySelector('[data-test-id="restore-post-title"]')).not.toBeInTheDocument();
    });

    it("renders local revision rows from localStorage", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 20, 11, 5));

        const revisionTimestamp = new Date(2026, 5, 20, 9, 5).getTime();
        const excerpt = "This excerpt is deliberately longer than one hundred characters so the restore list keeps the preview compact and table friendly.";

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify({
            excerpt,
            id: "draft",
            revisionTimestamp,
            title: "Recovered draft",
            type: "post"
        }));

        const {container} = renderRestoreRoute();

        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByRole("columnheader", {name: "Title"})).toBeInTheDocument();
        expect(screen.getByRole("columnheader", {name: "Created"})).toBeInTheDocument();
        expect(getRestorePostTitle(container)).toHaveTextContent("Recovered draft");
        expect(screen.getByText(excerpt.slice(0, 100))).toBeInTheDocument();
        expect(screen.getAllByText("20 Jun 2026")).toHaveLength(2);
        expect(screen.getAllByText("2 hours ago")).toHaveLength(2);
        expect(getRestorePostButton(container)).toHaveTextContent("Restore");
    });

    it("uses the no-title fallback for untitled revisions", () => {
        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify({
            excerpt: "",
            id: "draft",
            revisionTimestamp: 1000,
            title: "",
            type: "post"
        }));

        const {container} = renderRestoreRoute();

        expect(getRestorePostTitle(container)).toHaveTextContent("(no title)");
    });

    restoreTest("restores the selected revision and shows a success toast", async ({server}) => {
        const revision = {
            authors: [{id: "user-1", name: "Test User"}],
            excerpt: "Selected revision excerpt",
            id: "draft",
            lexical: "{\"root\":{\"children\":[],\"type\":\"root\",\"version\":1}}",
            revisionTimestamp: 1000,
            slug: "selected-revision",
            tags: [{id: "tag-1", name: "Tag"}],
            title: "Selected revision",
            type: "post"
        };
        const requests: unknown[] = [];

        server.use(
            http.post(POSTS_API_URL, async ({request}) => {
                const body = await request.json();
                requests.push(body);

                return HttpResponse.json({
                    posts: [{
                        id: "post-1",
                        slug: "selected-revision",
                        title: "(Restored) Selected revision",
                        url: "https://example.com/selected-revision/",
                        uuid: "post-uuid"
                    }]
                });
            })
        );

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify(revision));

        const {container} = renderRestoreRoute();

        fireEvent.click(getRestorePostButton(container));

        expect(getRestorePostButton(container)).toHaveTextContent("Restoring");
        expect(getRestorePostButton(container)).toBeDisabled();

        await waitFor(() => {
            expect(mockToastSuccess).toHaveBeenCalledWith("Post restored successfully");
        });
        expect(mockToastError).not.toHaveBeenCalled();
        expect(requests).toEqual([{
            posts: [{
                authors: [{id: "user-1"}],
                lexical: revision.lexical,
                post_revisions: [],
                slug: "selected-revision",
                status: "draft",
                tags: revision.tags,
                title: "(Restored) Selected revision",
                type: "post"
            }]
        }]);
    });

    restoreTest("shows an error toast when restoring fails", async ({server}) => {
        server.use(
            http.post(POSTS_API_URL, () => {
                return new HttpResponse(null, {status: 500});
            })
        );

        window.localStorage.setItem("post-revision-draft-1000", JSON.stringify({
            excerpt: "",
            id: "draft",
            lexical: "{\"root\":{\"children\":[],\"type\":\"root\",\"version\":1}}",
            revisionTimestamp: 1000,
            title: "Failed revision",
            type: "post"
        }));

        const {container} = renderRestoreRoute();

        fireEvent.click(getRestorePostButton(container));

        await waitFor(() => {
            expect(mockToastError).toHaveBeenCalledWith("Failed to restore post");
        });

        expect(mockToastSuccess).not.toHaveBeenCalled();
        expect(getRestorePostButton(container)).toHaveTextContent("Restore");
        expect(getRestorePostButton(container)).not.toBeDisabled();
    });
});
