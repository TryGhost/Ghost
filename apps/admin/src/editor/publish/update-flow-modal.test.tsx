import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FullPost } from "@tryghost/admin-x-framework/api/editor";
import type { PostStatus } from "@/editor/state";
import { UpdateFlowModal } from "./update-flow-modal";

vi.mock("./use-publish-data", () => ({
    useSiteTimezone: () => "Etc/UTC",
    usePublishOptionsInput: () => null,
}));

function makePost(overrides: Partial<FullPost> = {}): FullPost {
    return {
        id: "post-1",
        status: "scheduled",
        published_at: "2050-01-01T10:00:00.000Z",
        email: null,
        email_only: false,
        ...overrides,
    } as FullPost;
}

function setup({
    post = makePost(),
    status = "scheduled" as PostStatus,
    performSave = vi.fn<() => Promise<FullPost>>().mockResolvedValue(post),
    onClose = vi.fn(),
} = {}) {
    render(
        <UpdateFlowModal
            performSave={performSave}
            post={post}
            resource="posts"
            status={status}
            onClose={onClose}
        />,
    );
    return { performSave, onClose };
}

describe("UpdateFlowModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows the unschedule copy for scheduled posts", () => {
        setup();

        expect(document.querySelector('[data-test-modal="update-flow"]')).not.toBeNull();
        expect(screen.getByRole("heading", { name: "Unschedule" })).toBeInTheDocument();
        expect(document.querySelector("[data-test-update-flow-title]")).toHaveTextContent("This post has been scheduled");
        expect(document.querySelector('[data-test-button="revert-to-draft"]'))
            .toHaveTextContent("Unschedule and revert to draft");
    });

    it("reverts scheduled posts to draft, clearing published_at", async () => {
        const { performSave, onClose } = setup();

        fireEvent.click(document.querySelector('[data-test-button="revert-to-draft"]') as HTMLElement);
        await act(async () => {
            await Promise.resolve();
        });

        expect(performSave).toHaveBeenCalledWith({
            saveType: "draft",
            publishedAt: null,
            emailOnly: false,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("reverts published posts to draft without touching published_at", async () => {
        const { performSave, onClose } = setup({
            post: makePost({ status: "published" }),
            status: "published",
        });

        expect(screen.getByRole("heading", { name: "Unpublish" })).toBeInTheDocument();
        expect(document.querySelector('[data-test-button="revert-to-draft"]'))
            .toHaveTextContent("Unpublish and revert to private draft");

        fireEvent.click(document.querySelector('[data-test-button="revert-to-draft"]') as HTMLElement);
        await act(async () => {
            await Promise.resolve();
        });

        expect(performSave).toHaveBeenCalledWith({
            saveType: "draft",
            publishedAt: undefined,
            emailOnly: false,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("keeps the modal open and shows the error when the revert fails", async () => {
        const { onClose } = setup({
            performSave: vi.fn<() => Promise<FullPost>>().mockRejectedValue(new Error("Revert failed!")),
        });

        fireEvent.click(document.querySelector('[data-test-button="revert-to-draft"]') as HTMLElement);
        await act(async () => {
            await Promise.resolve();
        });

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText("Revert failed!")).toBeInTheDocument();
    });

    it("closes via the close button", () => {
        const { onClose } = setup();

        fireEvent.click(screen.getByRole("button", { name: "Close" }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
