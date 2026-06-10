import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorResource, FullPost } from "@tryghost/admin-x-framework/api/editor";
import { PreviewModal } from "./preview-modal";

type MockSetting = { key: string; value: unknown };

const mocks = vi.hoisted(() => ({
    settings: [
        { key: "members_enabled", value: true },
        { key: "paid_members_enabled", value: true },
        { key: "editor_default_email_recipients", value: "visibility" },
        { key: "default_email_address", value: "noreply@example.com" },
    ] as MockSetting[],
    currentUser: { id: "user-1", roles: [{ name: "Administrator" }] } as { id: string; roles: Array<{ name: string }> },
    newsletters: [
        { id: "newsletter-1", slug: "default-newsletter", name: "Default newsletter", status: "active", sort_order: 0, sender_email: "news@example.com" },
    ] as Array<Record<string, unknown>>,
    emailPreview: vi.fn<(id: string, options: { searchParams: Record<string, string> }) => unknown>(),
}));

vi.mock("@tryghost/admin-x-framework/api/site", () => ({
    useBrowseSite: () => ({ data: { site: { url: "http://localhost:2368/" } } }),
}));

vi.mock("@tryghost/admin-x-framework/api/settings", () => ({
    useBrowseSettings: () => ({ data: { settings: mocks.settings } }),
    getSettingValue: (settings: MockSetting[] | undefined, key: string) => settings?.find(setting => setting.key === key)?.value ?? null,
}));

vi.mock("@tryghost/admin-x-framework/api/current-user", () => ({
    useCurrentUser: () => ({ data: mocks.currentUser }),
}));

vi.mock("@tryghost/admin-x-framework/api/users", () => ({
    isContributorUser: (user: { roles: Array<{ name: string }> }) => user.roles.some(role => role.name === "Contributor"),
}));

vi.mock("@tryghost/admin-x-framework/api/newsletters", () => ({
    useBrowseNewsletters: () => ({ data: { newsletters: mocks.newsletters } }),
}));

vi.mock("@tryghost/admin-x-framework/api/config", () => ({
    useBrowseConfig: () => ({ data: { config: {} } }),
    isManagedEmail: () => false,
    hasSendingDomain: () => false,
    sendingDomain: () => undefined,
}));

vi.mock("@tryghost/admin-x-framework/api/email-previews", () => ({
    getPostEmailPreview: (id: string, options: { searchParams: Record<string, string> }) => mocks.emailPreview(id, options),
}));

const post = { id: "post-1", uuid: "uuid-1" } as FullPost;

const EMAIL_HTML = "<!DOCTYPE html><html><head><style>body { margin: 0; }</style></head><body>Email body</body></html>";

function setup({
    resource = "posts" as EditorResource,
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
            resource={resource}
            status={status}
            onClose={onClose}
        />,
    );
    return { performSave, onClose };
}

function desktopFrame(): HTMLIFrameElement | null {
    return document.querySelector('iframe[title="Desktop browser post preview"]');
}

function emailFrame(): HTMLIFrameElement | null {
    return document.querySelector('iframe[title="Email preview"]');
}

describe("PreviewModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.settings = [
            { key: "members_enabled", value: true },
            { key: "paid_members_enabled", value: true },
            { key: "editor_default_email_recipients", value: "visibility" },
            { key: "default_email_address", value: "noreply@example.com" },
        ];
        mocks.currentUser = { id: "user-1", roles: [{ name: "Administrator" }] };
        mocks.emailPreview.mockReturnValue({
            data: { email_previews: [{ html: EMAIL_HTML, subject: "Test subject" }] },
            isLoading: false,
        });
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

    it("renders the email preview from the email-preview endpoint on the Email tab", () => {
        setup();

        fireEvent.click(screen.getByRole("button", { name: "Email" }));

        expect(desktopFrame()).toBeNull();
        expect(mocks.emailPreview).toHaveBeenCalledWith("post-1", {
            searchParams: { memberSegment: "status:free", newsletter: "default-newsletter" },
        });

        const iframe = emailFrame();
        expect(iframe).not.toBeNull();
        expect(iframe?.getAttribute("srcdoc")).toContain("Email body");
        // the scrollbar-hiding CSS is appended to the email's stylesheet
        expect(iframe?.getAttribute("srcdoc")).toContain("scrollbar-width: none;");
        expect(screen.getByText("Test subject")).toBeInTheDocument();
        expect(screen.getByText(/Default newsletter/)).toBeInTheDocument();
    });

    it("previews the paid segment when selected on the Email tab", () => {
        setup();

        fireEvent.click(screen.getByRole("button", { name: "Email" }));
        fireEvent.change(screen.getByLabelText("Preview as"), { target: { value: "paid" } });

        expect(mocks.emailPreview).toHaveBeenLastCalledWith("post-1", {
            searchParams: { memberSegment: "status:-free", newsletter: "default-newsletter" },
        });
    });

    it("falls back from the anonymous web segment to free when switching to email", () => {
        setup();

        fireEvent.change(screen.getByLabelText("Preview as"), { target: { value: "anonymous" } });
        expect(desktopFrame()?.src).toBe("http://localhost:2368/p/uuid-1/?member_status=anonymous");

        fireEvent.click(screen.getByRole("button", { name: "Email" }));
        expect(mocks.emailPreview).toHaveBeenCalledWith("post-1", {
            searchParams: { memberSegment: "status:free", newsletter: "default-newsletter" },
        });
    });

    it("hides the Email tab for pages", () => {
        setup({ resource: "pages" });

        expect(screen.queryByRole("button", { name: "Email" })).toBeNull();
    });

    it("hides the Email tab when members are disabled", () => {
        mocks.settings = mocks.settings.map(setting => (
            setting.key === "members_enabled" ? { ...setting, value: false } : setting
        ));
        setup();

        expect(screen.queryByRole("button", { name: "Email" })).toBeNull();
    });

    it("hides the Email tab when email sending is disabled", () => {
        mocks.settings = mocks.settings.map(setting => (
            setting.key === "editor_default_email_recipients" ? { ...setting, value: "disabled" } : setting
        ));
        setup();

        expect(screen.queryByRole("button", { name: "Email" })).toBeNull();
    });

    it("hides the Email tab for contributors", () => {
        mocks.currentUser = { id: "user-2", roles: [{ name: "Contributor" }] };
        setup();

        expect(screen.queryByRole("button", { name: "Email" })).toBeNull();
    });
});
