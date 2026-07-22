import { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Dropzone } from "@tryghost/shade/components";
import { useImportContent } from "@tryghost/admin-x-framework/api/db";

import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Universal import dialog, ported from the legacy
 * migration-tools/universal-import-modal.tsx onto a shade Dropzone (the
 * legacy pasted grey click-panel is gone). Legacy shows it without a route,
 * so it stays state-driven.
 */
export function UniversalImportDialog({ onClose }: { onClose: () => void }) {
    const { mutateAsync: importContent } = useImportContent();
    const [uploading, setUploading] = useState(false);
    const handleError = useSettingsHandleError();
    const { confirm } = useConfirmation();

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            await importContent(file);
            onClose();
            confirm({
                title: "Import in progress",
                prompt: "Your import is being processed, and you'll receive a confirmation email as soon as it’s complete. Usually this only takes a few minutes, but larger imports may take longer.",
                cancelLabel: "",
                okLabel: "Got it",
                onOk: () => {},
            });
        } catch (e) {
            handleError(e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[480px]" data-testid="universal-import-modal">
                <DialogHeader>
                    <DialogTitle>Universal import</DialogTitle>
                </DialogHeader>
                <Dropzone
                    accept={{ "application/json": [".json"], "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] }}
                    disabled={uploading}
                    onDropAccepted={(files) => {
                        if (files[0]) {
                            void handleUpload(files[0]);
                        }
                    }}
                >
                    <div className="text-center text-sm text-muted-foreground">
                        {uploading ? "Uploading..." : <>Select any JSON or zip file that contains <br />posts and settings</>}
                    </div>
                </Dropzone>
                <div className="flex items-center justify-between">
                    <a className="text-sm font-medium text-state-success" href="https://docs.ghost.org/migration/ghost" rel="noopener noreferrer" target="_blank">Learn about importing</a>
                    <Button disabled={uploading} variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
