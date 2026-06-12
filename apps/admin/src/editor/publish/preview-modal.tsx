import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { useBrowseNewsletters } from "@tryghost/admin-x-framework/api/newsletters";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { isContributorUser } from "@tryghost/admin-x-framework/api/users";
import { Button } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { type PostStatus } from "@/editor/state";
import { type ManualSaveOptions } from "@/editor/use-editor";
import { EmailPreview, type EmailPreviewSegment } from "./email-preview";

// Injected into the (same-origin) preview iframe so Escape closes the modal
// even while the iframe has focus. The e2e suite waits for
// `ghostPreviewEscapeHandlerReady` before pressing Escape, so the flag must be
// set by this script (Ember parity: editor/modals/preview/browser.js).
const ESCAPE_HANDLER_SCRIPT = `
(function() {
    window.ghostPreviewEscapeHandlerReady = true;
    function onKeydown(e) {
        if (e.key === 'Escape') {
            window.parent.postMessage({ type: 'escapeKeyPressed' }, '*');
        }
    }
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('keydown', onKeydown, true);
})();
`;

function injectEscapeHandler(iframe: HTMLIFrameElement) {
    try {
        const doc = iframe.contentWindow?.document;
        if (doc?.body && !doc.querySelector("script[data-ghost-preview-escape-handler]")) {
            const script = doc.createElement("script");
            script.setAttribute("data-ghost-preview-escape-handler", "true");
            script.innerHTML = ESCAPE_HANDLER_SCRIPT;
            doc.body.appendChild(script);
        }
    } catch {
        // cross-origin previews can't be instrumented; Escape still works
        // while focus is outside the iframe
    }
}

type PreviewFormat = "browser" | "email";
type PreviewSegment = "anonymous" | EmailPreviewSegment;

/**
 * Preview modal (Ember's editor/modals/preview): a Web tab renders the
 * frontend preview URL (/p/:uuid) in a desktop- or mobile-sized iframe; an
 * Email tab renders the post's email preview from the Admin API email-preview
 * endpoint (posts only, members enabled, non-contributors — same gates as
 * Ember). Dirty drafts are saved before the preview loads so it shows the
 * latest content.
 */
export function PreviewModal({ post, resource, status, isDirty, performSave, onClose }: {
    post: FullPost;
    resource: EditorResource;
    /** Current status from the editor machine. */
    status: PostStatus;
    isDirty: boolean;
    performSave: (options: ManualSaveOptions) => Promise<FullPost>;
    onClose: () => void;
}) {
    const { data: siteData } = useBrowseSite();
    const { data: settingsData } = useBrowseSettings();
    const { data: currentUser } = useCurrentUser();
    const [format, setFormat] = useState<PreviewFormat>("browser");
    const [size, setSize] = useState<"desktop" | "mobile">("desktop");
    const [segment, setSegment] = useState<PreviewSegment>("free");
    const [newsletterSlug, setNewsletterSlug] = useState<string | null>(null);
    // Ember saveFirstTask: persist pending edits before previewing a draft
    const [saving, setSaving] = useState(status === "draft" && isDirty);

    const settings = settingsData?.settings;
    const membersEnabled = getSettingValue<boolean>(settings, "members_enabled") ?? false;
    const paidMembersEnabled = getSettingValue<boolean>(settings, "paid_members_enabled") ?? false;
    const emailRecipients = getSettingValue<string>(settings, "editor_default_email_recipients") ?? "visibility";
    const isContributor = currentUser ? isContributorUser(currentUser) : true;

    // Ember gates the Email tab on members + email being enabled, posts only
    // (pages have no email) and non-contributors (preview.hbs)
    const showEmailTab = membersEnabled && emailRecipients !== "disabled" && resource === "posts" && !isContributor;

    const { data: newslettersData } = useBrowseNewsletters({
        enabled: showEmailTab,
    });
    const activeNewsletters = useMemo(() => (
        (newslettersData?.newsletters ?? [])
            .filter(newsletter => newsletter.status === "active")
            .sort((a, b) => a.sort_order - b.sort_order)
    ), [newslettersData]);

    useEffect(() => {
        if (!saving) {
            return;
        }
        let cancelled = false;
        performSave({})
            .catch(() => {
                // the editor status surfaces save errors; still show the preview
            })
            .finally(() => {
                if (!cancelled) {
                    setSaving(false);
                }
            });
        return () => {
            cancelled = true;
        };
        // run the save-first pass once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        const onMessage = (event: MessageEvent) => {
            if ((event.data as { type?: string } | null)?.type === "escapeKeyPressed") {
                onClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("message", onMessage);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("message", onMessage);
        };
    }, [onClose]);

    // Ember's config.blogUrl is derived from the site endpoint's `url`
    // (config-manager.js); the Admin /config/ API itself has no blogUrl
    const siteUrl = siteData?.site?.url;
    let previewUrl: string | null = null;
    if (siteUrl && post.uuid) {
        // routeKeywords.preview: 'p' (Ember post.previewUrl)
        const url = new URL(`${siteUrl.replace(/\/+$/, "")}/p/${post.uuid}/`);
        url.searchParams.set("member_status", segment);
        previewUrl = url.toString();
    }

    const handleIframeLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
        injectEscapeHandler(event.currentTarget);
    };

    const changeFormat = (nextFormat: PreviewFormat) => {
        setFormat(nextFormat);
        // the email preview endpoint has no anonymous segment (Ember's
        // changePreviewFormat falls back to 'free')
        if (nextFormat === "email" && segment === "anonymous") {
            setSegment("free");
        }
    };

    // Ember's previewAsOptions: web previews support anonymous visitors,
    // email previews don't; paid options need Stripe
    const segmentOptions: Array<{ label: string; value: PreviewSegment }> = [
        ...(format === "browser" ? [{ label: "Public visitor", value: "anonymous" as const }] : []),
        { label: "Free member", value: "free" as const },
        ...(paidMembersEnabled ? [{ label: "Paid member", value: "paid" as const }] : []),
    ];
    // Ember's showMemberSegmentDropdown: always on web, only with >1 option on email
    const showSegmentSelect = format === "browser" || segmentOptions.length > 1;

    const formatTabClass = (active: boolean) => `h-[34px] px-3 text-[1.35rem] hover:bg-[#EBEEF0] ${active ? "text-[#15171A]" : "text-[#7C8B9A]"}`;

    return createPortal(
        <div className="shade shade-admin fixed inset-0 z-[60] flex flex-col bg-[#F9FAFB]">
            <header className="relative flex h-[58px] shrink-0 items-center justify-between gap-2 bg-[#F9FAFB] px-5">
                <h2 className="text-[1.7rem] font-bold tracking-[-0.01em] text-[#15171A]">Preview</h2>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
                    {showEmailTab ? (
                        <>
                            <Button
                                className={formatTabClass(format === "browser")}
                                data-test-button="browser-preview"
                                data-test-selected={format === "browser" ? "true" : undefined}
                                variant="ghost"
                                onClick={() => changeFormat("browser")}
                            >
                                Web
                            </Button>
                            <Button
                                className={formatTabClass(format === "email")}
                                data-test-button="email-preview"
                                data-test-selected={format === "email" ? "true" : undefined}
                                variant="ghost"
                                onClick={() => changeFormat("email")}
                            >
                                Email
                            </Button>
                            <div className="mx-1 h-6 w-px bg-[#DDE1E5]" />
                        </>
                    ) : null}
                    <Button
                        className={`h-[34px] w-[42px] hover:bg-[#EBEEF0] ${size === "desktop" ? "text-[#15171A]" : "text-[#7C8B9A]"}`}
                        title="Desktop preview"
                        variant="ghost"
                        onClick={() => setSize("desktop")}
                    >
                        <LucideIcon.Monitor aria-hidden="true" className="size-4" />
                        <span className="sr-only">Desktop</span>
                    </Button>
                    <Button
                        className={`h-[34px] w-[42px] hover:bg-[#EBEEF0] ${size === "mobile" ? "text-[#15171A]" : "text-[#7C8B9A]"}`}
                        title="Mobile preview"
                        variant="ghost"
                        onClick={() => setSize("mobile")}
                    >
                        <LucideIcon.Smartphone aria-hidden="true" className="size-4" />
                        <span className="sr-only">Mobile</span>
                    </Button>
                    {showSegmentSelect ? (
                        <>
                            <div className="mx-1 h-6 w-px bg-[#DDE1E5]" />
                            <span data-test-select="preview-segment">
                                <select
                                    aria-label="Preview as"
                                    className="h-[34px] rounded-md bg-transparent px-2 text-[1.3rem] font-medium text-[#15171A] hover:bg-[#EBEEF0]"
                                    value={segment}
                                    onChange={event => setSegment(event.target.value as PreviewSegment)}
                                >
                                    {segmentOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </span>
                        </>
                    ) : null}
                </div>
                <Button
                    className="h-[34px] px-3 text-[1.35rem] text-[#394047] hover:bg-[#EBEEF0]"
                    variant="ghost"
                    onClick={onClose}
                >
                    Close
                </Button>
            </header>

            <div className="flex min-h-0 flex-1 px-2 pb-0">
                {saving ? (
                    <div className="m-auto text-[1.4rem] text-[#54666D]">Saving...</div>
                ) : format === "email" ? (
                    <EmailPreview
                        mobile={size === "mobile"}
                        newsletters={activeNewsletters}
                        post={post}
                        segment={segment === "anonymous" ? "free" : segment}
                        selectedNewsletterSlug={newsletterSlug ?? post.newsletter?.slug ?? null}
                        onChangeNewsletter={setNewsletterSlug}
                    />
                ) : previewUrl ? (
                    size === "mobile" ? (
                        <iframe
                            className="m-auto h-full max-h-[820px] w-[390px] rounded-t-3xl border-8 border-b-0 border-gray-900 bg-white"
                            src={previewUrl}
                            title="Mobile browser post preview"
                            onLoad={handleIframeLoad}
                        />
                    ) : (
                        <iframe
                            className="size-full rounded-t-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_9px_rgba(0,0,0,0.05)]"
                            src={previewUrl}
                            title="Desktop browser post preview"
                            onLoad={handleIframeLoad}
                        />
                    )
                ) : (
                    <div className="m-auto text-[1.4rem] text-[#54666D]">Preview unavailable.</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
