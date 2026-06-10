import { useEffect, useRef, useState } from "react";
import { type EditorResource, type FullPost } from "@tryghost/admin-x-framework/api/editor";
import { Button } from "@tryghost/shade/components";
import { type UseEditorResult } from "@/editor/use-editor";
import { PreviewModal } from "./preview-modal";
import { PublishFlowModal } from "./publish-flow-modal";
import { UpdateFlowModal } from "./update-flow-modal";
import { validatePost } from "./publish-options";

const SHOW_SAVE_STATUS_DURATION = 3000;

type OpenModal = "publish" | "update" | "preview" | null;

/**
 * Editor header publish controls (Ember's Editor::PublishManagement +
 * publish-buttons): Preview + Publish for drafts; Update + Unpublish/
 * Unschedule for published/scheduled posts; Update only for sent posts.
 * Owns the publish, update and preview modals.
 */
export function PublishManagement({ editor, post, resource }: {
    editor: UseEditorResult;
    /** Latest full post from the API (save responses win over the initial load). */
    post: FullPost | null;
    resource: EditorResource;
}) {
    const [openModal, setOpenModal] = useState<OpenModal>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [updateState, setUpdateState] = useState<"idle" | "running" | "success">("idle");
    const updateResetRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (updateResetRef.current !== null) {
            window.clearTimeout(updateResetRef.current);
        }
    }, []);

    const machinePost = editor.state.post;
    if (!machinePost?.id || !post) {
        return null;
    }

    const status = machinePost.status;
    const isDraft = status === "draft";

    // Ember validates the post before opening any of the flows
    const openWithValidation = (modal: Exclude<OpenModal, null>) => {
        const error = validatePost({ title: editor.state.titleScratch });
        if (error) {
            setValidationError(error);
            return;
        }
        setValidationError(null);
        setOpenModal(modal);
    };

    const handleUpdate = async () => {
        if (updateState === "running") {
            return;
        }
        setUpdateState("running");
        try {
            await editor.performManualSave();
            setUpdateState("success");
            if (updateResetRef.current !== null) {
                window.clearTimeout(updateResetRef.current);
            }
            updateResetRef.current = window.setTimeout(() => {
                updateResetRef.current = null;
                setUpdateState("idle");
            }, SHOW_SAVE_STATUS_DURATION);
        } catch {
            // the editor status surfaces save errors
            setUpdateState("idle");
        }
    };

    return (
        <>
            {validationError ? (
                <span className="max-w-64 truncate text-sm text-red-600" title={validationError}>
                    {validationError}
                </span>
            ) : null}

            {isDraft ? (
                <>
                    <Button variant="ghost" onClick={() => openWithValidation("preview")}>
                        Preview
                    </Button>
                    <Button data-test-button="publish-flow" variant="default" onClick={() => openWithValidation("publish")}>
                        Publish
                    </Button>
                </>
            ) : (
                <>
                    <Button
                        data-test-button="publish-save"
                        disabled={updateState === "running"}
                        variant="default"
                        onClick={() => void handleUpdate()}
                    >
                        {updateState === "running" ? "Updating..." : updateState === "success" ? "Updated" : "Update"}
                    </Button>
                    {status !== "sent" ? (
                        <Button data-test-button="update-flow" variant="outline" onClick={() => openWithValidation("update")}>
                            {status === "scheduled" ? "Unschedule" : "Unpublish"}
                        </Button>
                    ) : null}
                </>
            )}

            {openModal === "publish" ? (
                <PublishFlowModal
                    performSave={editor.performManualSave}
                    post={post}
                    resource={resource}
                    onClose={() => setOpenModal(null)}
                />
            ) : null}

            {openModal === "update" ? (
                <UpdateFlowModal
                    performSave={editor.performManualSave}
                    post={post}
                    resource={resource}
                    status={status}
                    onClose={() => setOpenModal(null)}
                />
            ) : null}

            {openModal === "preview" ? (
                <PreviewModal
                    isDirty={editor.isDirty}
                    performSave={editor.performManualSave}
                    post={post}
                    status={status}
                    onClose={() => setOpenModal(null)}
                />
            ) : null}
        </>
    );
}
