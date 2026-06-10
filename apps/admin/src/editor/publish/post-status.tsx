import { useState } from "react";
import { type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { type EditorState } from "@/editor/state";
import { formatScheduledTime } from "./schedule-time";
import { useSiteTimezone } from "./use-publish-data";

/**
 * Editor header status text, ported from Ember's gh-editor-post-status:
 * scheduled posts reveal a "to be published/sent ..." countdown on hover.
 * `post` is the latest full post from the API (for newsletter/email data the
 * editor machine doesn't model); `state` is the editor machine state and is
 * the source of truth for the status itself.
 */
export function EditorPostStatus({ state, isDirty, post }: {
    state: EditorState;
    isDirty: boolean;
    post: FullPost | null;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const timezone = useSiteTimezone();

    const machinePost = state.post;
    const isError = state.save.status === "error";

    let content: React.ReactNode = "";

    if (machinePost) {
        if (state.save.status === "saving" && machinePost.status === "draft") {
            content = "Saving...";
        } else if (state.save.status === "error") {
            content = state.save.error.message;
        } else {
            switch (machinePost.status) {
                case "sent":
                    content = "Sent";
                    break;
                case "published":
                    content = "Published";
                    break;
                case "scheduled": {
                    const publishedAt = machinePost.publishedAt ? new Date(machinePost.publishedAt) : null;
                    const scheduledTime = publishedAt ? formatScheduledTime(publishedAt, timezone) : "";
                    const emailOnly = Boolean(post?.email_only);
                    const willAlsoEmail = Boolean(post?.newsletter) && !post?.email;
                    const detail = emailOnly
                        ? `to be sent ${scheduledTime}`
                        : `to be published${willAlsoEmail ? " and sent" : ""} ${scheduledTime}`;

                    content = (
                        <>
                            Scheduled
                            {isHovered && publishedAt ? (
                                <time
                                    className="ml-1 text-green-600"
                                    data-test-schedule-countdown
                                    dateTime={machinePost.publishedAt ?? undefined}
                                >
                                    {detail}
                                </time>
                            ) : null}
                        </>
                    );
                    break;
                }
                default:
                    if (machinePost.id === null) {
                        content = "New";
                    } else {
                        content = isDirty ? "Draft" : "Draft - Saved";
                    }
            }
        }
    }

    return (
        <div
            className={`truncate px-3 text-[1.35rem] ${isError ? "text-red-600" : "text-[#8E9CAC]"}`}
            data-test-editor-post-status
            onMouseLeave={() => setIsHovered(false)}
            onMouseOver={() => setIsHovered(true)}
        >
            {content}
        </div>
    );
}
