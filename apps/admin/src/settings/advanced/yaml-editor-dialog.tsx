import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@tryghost/shade/components";
import { APIError, JSONError } from "@tryghost/admin-x-framework/errors";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";

import { CodeEditor } from "./code-editor";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The full-screen redirects/routes YAML editor, ported from the legacy
 * labs/yaml-file-editor-modal.tsx: loads the current file from the download
 * endpoint, saves through the upload mutation, and keeps validation errors
 * inline (`yaml-editor-error`) with the editor open.
 */

export interface YamlEditorDialogProps {
    title: string;
    hint?: ReactNode;
    testId: string;
    downloadPath: string;
    uploadFilename: string;
    successMessage: string;
    onUpload: (file: File) => Promise<unknown>;
    onClose: () => void;
}

const extractErrorMessage = (error: unknown): string => {
    if (error instanceof JSONError && error.data?.errors?.[0]) {
        return error.data.errors[0].context || error.data.errors[0].message;
    }

    if (error instanceof APIError) {
        return error.message;
    }

    return "Something went wrong, please try again.";
};

export function YamlEditorDialog({
    title,
    hint,
    testId,
    downloadPath,
    uploadFilename,
    successMessage,
    onUpload,
    onClose,
}: YamlEditorDialogProps) {
    const handleError = useSettingsHandleError();

    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            setIsLoading(true);
            setLoadError(null);

            try {
                const { apiRoot } = getGhostPaths();
                const response = await fetch(`${apiRoot}${downloadPath}`, {
                    credentials: "include",
                    headers: {
                        Accept: "text/yaml, text/plain, */*",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to load ${uploadFilename} (${response.status})`);
                }

                const text = await response.text();

                if (isMounted) {
                    setContent(text);
                }
            } catch (error) {
                if (isMounted) {
                    setLoadError(error instanceof Error ? error.message : `Failed to load ${uploadFilename}`);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadContent();

        return () => {
            isMounted = false;
        };
    }, [downloadPath, uploadFilename]);

    const canSave = !isLoading && !loadError && !isSaving;

    const handleSaveRef = useRef<() => Promise<void>>(async () => {});
    handleSaveRef.current = async () => {
        if (isSaving || isLoading || loadError) {
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const file = new File([content], uploadFilename, { type: "text/yaml" });
            await onUpload(file);

            showToast({ type: "success", title: successMessage });
            onClose();
        } catch (error) {
            setSaveError(extractErrorMessage(error));
            handleError(error, { withToast: false });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                event.preventDefault();
                void handleSaveRef.current();
            }
        };

        window.addEventListener("keydown", handleKeydown);

        return () => {
            window.removeEventListener("keydown", handleKeydown);
        };
    }, []);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-8"
                data-testid={testId}
                onInteractOutside={(event) => event.preventDefault()}
            >
                <div className="mb-4 flex shrink-0 items-center justify-between">
                    <DialogTitle className="text-2xl">{title}</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        <Button disabled={!canSave} onClick={() => void handleSaveRef.current()}>
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>

                {(loadError || saveError) && (
                    <div className="mb-4 shrink-0 rounded-sm border border-destructive bg-destructive/5 px-4 py-2 text-sm text-destructive" data-testid="yaml-editor-error">
                        {saveError || loadError}
                    </div>
                )}

                <div className="flex min-h-0 flex-auto flex-col">
                    {!isLoading && (
                        <CodeEditor
                            hint={hint}
                            language="yaml"
                            value={content}
                            autoFocus
                            onChange={setContent}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
