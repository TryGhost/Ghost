import { useEffect, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { Button } from "@tryghost/shade/components";
import { type PostStatus } from "@/editor/state";
import { type ManualSaveOptions } from "@/editor/use-editor";

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

/**
 * Browser preview modal (Ember's editor/modals/preview, web format only):
 * renders the frontend preview URL (/p/:uuid) in a desktop- or mobile-sized
 * iframe. Dirty drafts are saved before the preview loads so it shows the
 * latest content.
 */
export function PreviewModal({ post, status, isDirty, performSave, onClose }: {
    post: FullPost;
    /** Current status from the editor machine. */
    status: PostStatus;
    isDirty: boolean;
    performSave: (options: ManualSaveOptions) => Promise<FullPost>;
    onClose: () => void;
}) {
    const { data: siteData } = useBrowseSite();
    const [size, setSize] = useState<"desktop" | "mobile">("desktop");
    // Ember saveFirstTask: persist pending edits before previewing a draft
    const [saving, setSaving] = useState(status === "draft" && isDirty);

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
        url.searchParams.set("member_status", "free");
        previewUrl = url.toString();
    }

    const handleIframeLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
        injectEscapeHandler(event.currentTarget);
    };

    return createPortal(
        <div className="shade shade-admin fixed inset-0 z-[60] flex flex-col bg-gray-100">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-6 py-3">
                <h2 className="text-lg font-bold">Preview</h2>
                <div className="flex items-center gap-2">
                    <Button variant={size === "desktop" ? "secondary" : "ghost"} onClick={() => setSize("desktop")}>
                        Desktop
                    </Button>
                    <Button variant={size === "mobile" ? "secondary" : "ghost"} onClick={() => setSize("mobile")}>
                        Mobile
                    </Button>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 p-4">
                {saving ? (
                    <div className="m-auto text-sm text-gray-600">Saving...</div>
                ) : previewUrl ? (
                    size === "mobile" ? (
                        <iframe
                            className="m-auto h-full max-h-[820px] w-[390px] rounded-3xl border-8 border-gray-900 bg-white"
                            src={previewUrl}
                            title="Mobile browser post preview"
                            onLoad={handleIframeLoad}
                        />
                    ) : (
                        <iframe
                            className="size-full rounded border border-gray-200 bg-white"
                            src={previewUrl}
                            title="Desktop browser post preview"
                            onLoad={handleIframeLoad}
                        />
                    )
                ) : (
                    <div className="m-auto text-sm text-gray-600">Preview unavailable.</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
