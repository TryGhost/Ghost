import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FullPost } from "@tryghost/admin-x-framework/api/editor";
import { createDefaultPostSettings, createInitialState, transition, type EditorState, type PostStatus } from "@/editor/state";
import { EditorPostStatus } from "./post-status";

vi.mock("./use-publish-data", () => ({
    useSiteTimezone: () => "Etc/UTC",
    usePublishOptionsInput: () => null,
}));

function makeState({ status = "draft" as PostStatus, id = "post-1" as string | null, publishedAt = null as string | null } = {}): EditorState {
    const { state } = transition(createInitialState(), {
        type: "POST_LOADED",
        post: {
            id,
            status,
            title: "My post",
            lexical: null,
            customExcerpt: null,
            slug: "my-post",
            tags: [],
            publishedAt,
            featureImage: null,
            updatedAt: "2026-01-01T00:00:00.000Z",
            settings: createDefaultPostSettings(),
        },
    });
    return state;
}

function statusElement(): HTMLElement {
    const element = document.querySelector("[data-test-editor-post-status]");
    expect(element).not.toBeNull();
    return element as HTMLElement;
}

describe("EditorPostStatus", () => {
    it("shows basic statuses", () => {
        const { rerender } = render(<EditorPostStatus isDirty={false} post={null} state={makeState({ id: null })} />);
        expect(statusElement()).toHaveTextContent("New");

        rerender(<EditorPostStatus isDirty={false} post={null} state={makeState()} />);
        expect(statusElement()).toHaveTextContent("Draft - Saved");

        rerender(<EditorPostStatus isDirty post={null} state={makeState()} />);
        expect(statusElement().textContent).toBe("Draft");

        rerender(<EditorPostStatus isDirty={false} post={null} state={makeState({ status: "published" })} />);
        expect(statusElement()).toHaveTextContent("Published");

        rerender(<EditorPostStatus isDirty={false} post={null} state={makeState({ status: "sent" })} />);
        expect(statusElement()).toHaveTextContent("Sent");
    });

    it("reveals the scheduled publish time on hover", () => {
        const state = makeState({ status: "scheduled", publishedAt: "2050-01-01T16:25:00.000Z" });
        render(<EditorPostStatus isDirty={false} post={{ id: "post-1" } as FullPost} state={state} />);

        expect(statusElement().textContent).toBe("Scheduled");

        fireEvent.mouseOver(statusElement());
        expect(statusElement().textContent).toMatch(/Scheduled\s*to be published at 16:25 \(UTC\) on 01 Jan 2050/);

        fireEvent.mouseLeave(statusElement());
        expect(statusElement().textContent).toBe("Scheduled");
    });

    it("mentions the email send for scheduled publish+send posts", () => {
        const state = makeState({ status: "scheduled", publishedAt: "2050-01-01T16:25:00.000Z" });
        const post = { id: "post-1", newsletter: { id: "n1" }, email: null } as unknown as FullPost;
        render(<EditorPostStatus isDirty={false} post={post} state={state} />);

        fireEvent.mouseOver(statusElement());
        expect(statusElement().textContent).toMatch(/to be published and sent at .*2050/);
    });

    it("says to be sent for scheduled email-only posts", () => {
        const state = makeState({ status: "scheduled", publishedAt: "2050-01-01T16:25:00.000Z" });
        const post = { id: "post-1", email_only: true } as unknown as FullPost;
        render(<EditorPostStatus isDirty={false} post={post} state={state} />);

        fireEvent.mouseOver(statusElement());
        expect(statusElement().textContent).toMatch(/to be sent at .*2050/);
    });
});
