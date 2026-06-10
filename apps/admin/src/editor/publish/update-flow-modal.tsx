import { useState } from "react";
import { createPortal } from "react-dom";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { type PostStatus } from "@/editor/state";
import { type ManualSaveOptions } from "@/editor/use-editor";
import { formatDayInTimezone, formatTimeInTimezone } from "./schedule-time";
import { useSiteTimezone } from "./use-publish-data";

/**
 * The unpublish/unschedule flow for published, scheduled and sent posts
 * (Ember's editor/modals/update-flow): shows what happened to the post and
 * offers reverting it to a draft.
 */
export function UpdateFlowModal({ post, status, resource, performSave, onClose }: {
    post: FullPost;
    /** Current status from the editor machine (the FullPost can lag a save). */
    status: PostStatus;
    resource: EditorResource;
    performSave: (options: ManualSaveOptions) => Promise<FullPost>;
    onClose: () => void;
}) {
    const timezone = useSiteTimezone();
    const [reverting, setReverting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const noun = resource === "pages" ? "page" : "post";
    const isScheduled = status === "scheduled";
    const isSentOnly = status === "sent";
    const emailed = Boolean(post.email) || Boolean(post.email_only);

    const publishedAt = post.published_at ? new Date(post.published_at) : null;
    const publishedAtText = publishedAt
        ? ` on ${formatDayInTimezone(publishedAt, timezone)} at ${formatTimeInTimezone(publishedAt, timezone)}`
        : "";

    const handleRevert = async () => {
        if (reverting) {
            return;
        }
        setReverting(true);
        setError(null);
        try {
            // Ember revertToDraftTask: scheduled posts also clear published_at
            await performSave({
                saveType: "draft",
                publishedAt: isScheduled ? null : undefined,
                emailOnly: false,
            });
            onClose();
        } catch (saveError) {
            setReverting(false);
            setError(saveError instanceof Error && saveError.message ? saveError.message : "Unknown Error");
        }
    };

    return createPortal(
        <div className="shade shade-admin fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white" data-test-modal="update-flow">
            <header className="flex shrink-0 items-center justify-between px-6 py-4">
                <h2 className="text-lg font-bold">{isScheduled ? "Unschedule" : "Unpublish"}</h2>
                <Button variant="outline" onClick={onClose}>Close</Button>
            </header>

            <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-10">
                <div className="mb-6 text-2xl font-bold" data-test-update-flow-title>
                    This {noun} {isSentOnly ? "was " : "has been "}
                    <span className="text-green-600">{isSentOnly ? `${status} by email` : status}</span>
                </div>

                <div className="text-lg text-gray-700" data-test-update-flow-confirmation>
                    <p>
                        Your {noun} {isScheduled ? "will be" : "was"}{" "}
                        {emailed
                            ? (post.email_only ? "sent to subscribers" : "published and sent to subscribers")
                            : "published on your site"}
                        {publishedAtText}.
                    </p>

                    {isScheduled || (status === "published" && !post.email_only) ? (
                        <p className="mt-6">
                            Need to make a change?{" "}
                            <button
                                className="font-semibold text-green-700 hover:text-green-800 disabled:opacity-60"
                                data-test-button="revert-to-draft"
                                disabled={reverting}
                                type="button"
                                onClick={() => void handleRevert()}
                            >
                                {isScheduled
                                    ? "Unschedule and revert to draft →"
                                    : "Unpublish and revert to private draft →"}
                            </button>
                        </p>
                    ) : null}

                    {error ? (
                        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body,
    );
}
