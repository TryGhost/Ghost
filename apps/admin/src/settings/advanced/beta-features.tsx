import { useState } from "react";
import { Button } from "@tryghost/shade/components";
import { downloadRedirects, useUploadRedirects } from "@tryghost/admin-x-framework/api/redirects";
import { downloadRoutes, useUploadRoutes } from "@tryghost/admin-x-framework/api/routes";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";

import { FeatureToggle } from "./feature-toggle";
import { FileUploadButton } from "./file-upload-button";
import { LabItem } from "./lab-item";
import { YamlEditorDialog } from "./yaml-editor-dialog";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/** The Labs "Beta features" tab, ported from the legacy labs/beta-features.tsx. */

const IS_AUTOMATIONS_BETA_ACTIVE = true;

type YamlEditor = "redirects" | "routes";

export function BetaFeatures() {
    const { data: settingsData } = useBrowseSettings();
    const settings = settingsData?.settings ?? [];
    const { mutateAsync: uploadRedirects } = useUploadRedirects();
    const { mutateAsync: uploadRoutes } = useUploadRoutes();
    const handleError = useSettingsHandleError();
    const [redirectsUploading, setRedirectsUploading] = useState(false);
    const [routesUploading, setRoutesUploading] = useState(false);
    const [openEditor, setOpenEditor] = useState<YamlEditor | null>(null);
    const labs = JSON.parse(getSettingValue<string>(settings, "labs") || "{}") as Record<string, boolean>;
    const isAutomationsEnabled = Boolean(labs.automations);

    const handleRedirectsUpload = async (file: File) => {
        try {
            setRedirectsUploading(true);
            await uploadRedirects(file);
            showToast({ title: "Redirects uploaded", type: "success" });
        } catch (e) {
            handleError(e);
        } finally {
            setRedirectsUploading(false);
        }
    };

    const handleRoutesUpload = async (file: File) => {
        try {
            setRoutesUploading(true);
            await uploadRoutes(file);
            showToast({ title: "Routes uploaded", type: "success" });
        } catch (e) {
            handleError(e);
        } finally {
            setRoutesUploading(false);
        }
    };

    return (
        <div className="flex flex-col divide-y divide-border">
            {IS_AUTOMATIONS_BETA_ACTIVE && (
                <LabItem
                    action={<FeatureToggle
                        confirmation={{
                            title: "Automations (beta)",
                            prompt: "This is a one-way street. Once enabled, the automations beta can't be turned off. Existing welcome emails will move into your automations automatically.",
                            okLabel: "Enable",
                            okRunningLabel: "Enabling...",
                        }}
                        disabled={isAutomationsEnabled}
                        flag="automations"
                        label="Automations (beta)"
                    />}
                    detail={<>Build automated email flows for your members, and get early access to new automation features as they ship. <a className="text-state-success" href="https://ghost.org/help/automations-beta" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a></>}
                    title="Automations (beta)"
                />
            )}
            <LabItem
                action={<FeatureToggle flag="superEditors" />}
                detail="Allows newly-assigned editors to manage members and comments in addition to regular roles."
                title="Enhanced Editor role (beta)"
            />
            <LabItem
                action={<FeatureToggle flag="editorExcerpt" />}
                detail="Adds the excerpt input below the post title in the editor"
                title="Show post excerpt inline"
            />
            <LabItem
                action={<FeatureToggle flag="additionalPaymentMethods" />}
                detail={<>Enable support for CashApp, iDEAL, Bancontact, and others. <a className="text-state-success" href="https://ghost.org/help/payment-methods" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a></>}
                title="Additional payment methods"
            />
            <LabItem
                action={(
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                            <FileUploadButton
                                id="upload-redirects"
                                onUpload={(file) => void handleRedirectsUpload(file)}
                            >
                                {redirectsUploading ? "Uploading ..." : "Upload redirects file"}
                            </FileUploadButton>
                            <Button size="sm" variant="outline" onClick={() => setOpenEditor("redirects")}>Edit</Button>
                        </div>
                        <Button className="text-state-success" size="sm" variant="ghost" onClick={() => downloadRedirects()}>Download current redirects</Button>
                    </div>
                )}
                detail={<>Configure redirects for old or moved content, <br /> more info in the <a className="text-state-success" href="https://ghost.org/tutorials/implementing-redirects/" rel="noopener noreferrer" target="_blank">docs</a></>}
                testId="redirects"
                title="Redirects"
            />
            <LabItem
                action={(
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                            <FileUploadButton
                                id="upload-routes"
                                onUpload={(file) => void handleRoutesUpload(file)}
                            >
                                {routesUploading ? "Uploading ..." : "Upload routes file"}
                            </FileUploadButton>
                            <Button size="sm" variant="outline" onClick={() => setOpenEditor("routes")}>Edit</Button>
                        </div>
                        <Button className="text-state-success" size="sm" variant="ghost" onClick={() => downloadRoutes()}>Download current routes</Button>
                    </div>
                )}
                detail="Configure dynamic routing by modifying the routes.yaml file"
                testId="routes"
                title="Routes"
            />
            {openEditor === "redirects" && (
                <YamlEditorDialog
                    downloadPath="/redirects/download/"
                    hint={<>Configure redirects for old or moved content. See the <a className="text-state-success" href="https://ghost.org/tutorials/implementing-redirects/" rel="noopener noreferrer" target="_blank">docs</a> for the file format.</>}
                    successMessage="Redirects updated"
                    testId="modal-redirects-editor"
                    title="Redirects"
                    uploadFilename="redirects.yaml"
                    onClose={() => setOpenEditor(null)}
                    onUpload={(file) => uploadRedirects(file)}
                />
            )}
            {openEditor === "routes" && (
                <YamlEditorDialog
                    downloadPath="/settings/routes/yaml/"
                    hint={<>Configure dynamic routing by editing the routes.yaml file. See the <a className="text-state-success" href="https://docs.ghost.org/themes/routing/" rel="noopener noreferrer" target="_blank">docs</a> for the file format.</>}
                    successMessage="Routes updated"
                    testId="modal-routes-editor"
                    title="Routes"
                    uploadFilename="routes.yaml"
                    onClose={() => setOpenEditor(null)}
                    onUpload={(file) => uploadRoutes(file)}
                />
            )}
        </div>
    );
}
