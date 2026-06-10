import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FullPost } from "@tryghost/admin-x-framework/api/editor";
import { PreviewModal } from "./preview-modal";

vi.mock("@tryghost/admin-x-framework/api/site", () => ({
    useBrowseSite: () => ({ data: { site: { url: "http://localhost:2368/" } } }),
}));

const post = { id: "post-1", uuid: "uuid-1" } as FullPost;

function setup({
    status = "draft" as const,
    isDirty = false,
    performSave = vi.fn<() => Promise<FullPost>>().mockResolvedValue(post),
    onClose = vi.fn(),
} = {}) {
    render(
        <PreviewModal
            isDirty={isDirty}
            performSave={performSave}
            post={post}
            status={status}
            onClose={onClose}
        />,
    );
    return { performSave, onClose };
}

function desktopFrame(): HTMLIFrameElement | null {
    return document.querySelector('iframe[title="Desktop browser post preview"]');
}

describe("PreviewModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the desktop preview iframe pointed at the post preview URL", () => {
        setup();

        expect(screen.getByRole("heading", { name: "Preview" })).toBeInTheDocument();
        const iframe = desktopFrame();
        expect(iframe).not.toBeNull();
        expect(iframe?.src).toBe("http://localhost:2368/p/uuid-1/?member_status=free");
    });

    it("switches between desktop and mobile preview sizes", () => {
        setup();

        fireEvent.click(screen.getByRole("button", { name: "Mobile" }));
        expect(desktopFrame()).toBeNull();
        const mobileFrame = document.querySelector('iframe[title="Mobile browser post preview"]');
        expect(mobileFrame).not.toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
        expect(desktopFrame()).not.toBeNull();
    });

    it("closes via the close button, the Escape key and the iframe escape message", () => {
        const { onClose } = setup();

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);

        fireEvent(window, new MessageEvent("message", { data: { type: "escapeKeyPressed" } }));
        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it("saves dirty drafts before showing the preview", async () => {
        const { performSave } = setup({ isDirty: true });

        expect(performSave).toHaveBeenCalledTimes(1);
        expect(desktopFrame()).toBeNull();

        await act(async () => {
            await Promise.resolve();
        });

        expect(desktopFrame()).not.toBeNull();
    });

    it("does not save clean posts before previewing", () => {
        const { performSave } = setup({ isDirty: false });

        expect(performSave).not.toHaveBeenCalled();
        expect(desktopFrame()).not.toBeNull();
    });
});
