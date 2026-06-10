import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FullPost } from "@tryghost/admin-x-framework/api/editor";
import { createInitialState, transition, type EditorState, type PostStatus } from "@/editor/state";
import type { UseEditorResult } from "@/editor/use-editor";
import { PublishManagement } from "./publish-management";

const mocks = vi.hoisted(() => ({
    publishFlowProps: { current: null as Record<string, unknown> | null },
    updateFlowProps: { current: null as Record<string, unknown> | null },
    previewProps: { current: null as Record<string, unknown> | null },
}));

vi.mock("./publish-flow-modal", () => ({
    PublishFlowModal: (props: Record<string, unknown>) => {
        mocks.publishFlowProps.current = props;
        return <div data-testid="mock-publish-flow-modal" />;
    },
}));

vi.mock("./update-flow-modal", () => ({
    UpdateFlowModal: (props: Record<string, unknown>) => {
        mocks.updateFlowProps.current = props;
        return <div data-testid="mock-update-flow-modal" />;
    },
}));

vi.mock("./preview-modal", () => ({
    PreviewModal: (props: Record<string, unknown>) => {
        mocks.previewProps.current = props;
        return <div data-testid="mock-preview-modal" />;
    },
}));

function makeState({ status = "draft" as PostStatus, id = "post-1" as string | null, title = "My post" } = {}): EditorState {
    const { state } = transition(createInitialState(), {
        type: "POST_LOADED",
        post: {
            id,
            status,
            title,
            lexical: null,
            customExcerpt: null,
            slug: "my-post",
            tags: [],
            publishedAt: null,
            featureImage: null,
            updatedAt: "2026-01-01T00:00:00.000Z",
        },
    });
    return state;
}

function makeEditor(state: EditorState, performManualSave = vi.fn<() => Promise<FullPost>>()): UseEditorResult {
    return {
        state,
        isDirty: false,
        performManualSave,
    } as unknown as UseEditorResult;
}

const fullPost = { id: "post-1", uuid: "uuid-1", status: "draft" } as FullPost;

function query(selector: string): HTMLElement | null {
    return document.querySelector(selector);
}

describe("PublishManagement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.publishFlowProps.current = null;
        mocks.updateFlowProps.current = null;
        mocks.previewProps.current = null;
    });

    it("renders Preview and Publish for drafts", () => {
        render(<PublishManagement editor={makeEditor(makeState())} post={fullPost} resource="posts" />);

        expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
        expect(query('[data-test-button="publish-flow"]')).toHaveTextContent("Publish");
        expect(query('[data-test-button="publish-save"]')).toBeNull();
    });

    it("renders nothing until the post exists", () => {
        render(<PublishManagement editor={makeEditor(makeState({ id: null }))} post={null} resource="posts" />);

        expect(query('[data-test-button="publish-flow"]')).toBeNull();
    });

    it("opens the publish flow from the publish button", () => {
        render(<PublishManagement editor={makeEditor(makeState())} post={fullPost} resource="posts" />);

        fireEvent.click(query('[data-test-button="publish-flow"]') as HTMLElement);

        expect(screen.getByTestId("mock-publish-flow-modal")).toBeInTheDocument();
        expect(mocks.publishFlowProps.current?.post).toBe(fullPost);
    });

    it("opens the preview modal from the preview button", () => {
        render(<PublishManagement editor={makeEditor(makeState())} post={fullPost} resource="posts" />);

        fireEvent.click(screen.getByRole("button", { name: "Preview" }));

        expect(screen.getByTestId("mock-preview-modal")).toBeInTheDocument();
    });

    it("blocks the flows and shows the error when validation fails", () => {
        const state = makeState({ title: "x".repeat(300) });
        render(<PublishManagement editor={makeEditor(state)} post={fullPost} resource="posts" />);

        fireEvent.click(query('[data-test-button="publish-flow"]') as HTMLElement);

        expect(screen.queryByTestId("mock-publish-flow-modal")).toBeNull();
        expect(screen.getByText(/255 characters/)).toBeInTheDocument();
    });

    it("renders Update and Unpublish for published posts and saves on update", async () => {
        const performManualSave = vi.fn<() => Promise<FullPost>>().mockResolvedValue(fullPost);
        const editor = makeEditor(makeState({ status: "published" }), performManualSave);
        render(<PublishManagement editor={editor} post={fullPost} resource="posts" />);

        const updateButton = query('[data-test-button="publish-save"]') as HTMLElement;
        expect(updateButton).toHaveTextContent("Update");
        expect(query('[data-test-button="update-flow"]')).toHaveTextContent("Unpublish");

        fireEvent.click(updateButton);
        await act(async () => {
            await Promise.resolve();
        });

        expect(performManualSave).toHaveBeenCalledTimes(1);
        expect(updateButton).toHaveTextContent("Updated");
    });

    it("labels the update flow Unschedule for scheduled posts and opens it", () => {
        const editor = makeEditor(makeState({ status: "scheduled" }));
        render(<PublishManagement editor={editor} post={fullPost} resource="posts" />);

        const updateFlowButton = query('[data-test-button="update-flow"]') as HTMLElement;
        expect(updateFlowButton).toHaveTextContent("Unschedule");

        fireEvent.click(updateFlowButton);

        expect(screen.getByTestId("mock-update-flow-modal")).toBeInTheDocument();
        expect(mocks.updateFlowProps.current?.status).toBe("scheduled");
    });

    it("hides the update flow for sent posts", () => {
        const editor = makeEditor(makeState({ status: "sent" }));
        render(<PublishManagement editor={editor} post={fullPost} resource="posts" />);

        expect(query('[data-test-button="publish-save"]')).not.toBeNull();
        expect(query('[data-test-button="update-flow"]')).toBeNull();
    });
});
