import { useEffect, useRef, useState } from "react";
import { Button, Field, FieldContent, FieldDescription, FieldLabel, Switch } from "@tryghost/shade/components";
import { type Setting, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useUploadFile } from "@tryghost/admin-x-framework/api/files";

import pinturaScreenshot from "./assets/pintura-screenshot.png";
import { IntegrationDialog } from "./integration-dialog";
import { IntegrationIcon } from "./integration-icon";
import { useSaveLabel } from "./use-save-label";
import { showToast, useSettingsHandleError } from "@/settings/app/shared/toast";

/** The Pintura configuration dialog (`/settings/integrations/pintura`), ported from the legacy pintura-modal.tsx. */
export function PinturaDialog() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const config = configData?.config;

    const [pinturaEnabled] = getSettingValues<boolean>(settings, ["pintura"]);
    const { mutateAsync: editSettings } = useEditSettings();
    const { mutateAsync: uploadFile } = useUploadFile();
    const handleError = useSettingsHandleError();
    const { label: okLabel, run, colorClass } = useSaveLabel();

    const [enabled, setEnabled] = useState<boolean>(Boolean(pinturaEnabled));
    const [uploadingState, setUploadingState] = useState({ js: false, css: false });

    useEffect(() => {
        setEnabled(pinturaEnabled || false);
    }, [pinturaEnabled]);

    const jsUploadRef = useRef<HTMLInputElement>(null);
    const cssUploadRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        const updates: Setting[] = [{ key: "pintura", value: enabled }];
        await run(() => editSettings(updates));
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, form: "js" | "css") => {
        try {
            setUploadingState((prev) => ({ ...prev, [form]: true }));

            const file = event.target?.files?.[0];
            if (!file) {
                return;
            }

            const { files } = await uploadFile({ file });
            const url = files[0].url;
            await editSettings([{ key: `pintura_${form}_url`, value: url }]);

            setUploadingState((prev) => ({ ...prev, [form]: false }));
            showToast({ type: "success", title: `Pintura ${form} uploaded` });
        } catch (e) {
            setUploadingState({ js: false, css: false });
            handleError(e);
        }
    };

    return (
        <IntegrationDialog
            detail="Advanced image editing"
            dirty={enabled !== Boolean(pinturaEnabled)}
            icon={<IntegrationIcon name="pintura" size={48} />}
            okColorClass={colorClass}
            okLabel={okLabel}
            testId="pintura-modal"
            title="Pintura"
            onOk={handleSave}
        >
            {!config?.pintura && (
                <div className="mb-7 flex flex-col items-stretch justify-between gap-4 rounded-sm bg-muted p-4 md:flex-row md:p-7">
                    <div className="md:basis-1/2">
                        <p className="mb-4 font-semibold">Add advanced image editing to Ghost, with Pintura</p>
                        <p className="mb-4 text-sm">Pintura is a powerful JavaScript image editor that allows you to crop, rotate, annotate and modify images directly inside Ghost.</p>
                        <p className="text-sm">Try a demo, purchase a license, and download the required CSS/JS files from pqina.nl/pintura/ to activate this feature.</p>
                    </div>
                    <div className="flex grow flex-col items-end justify-between gap-2 md:basis-1/2">
                        <img alt="Pintura screenshot" src={pinturaScreenshot} />
                        <a className="-mb-1 font-medium text-state-success" href="https://pqina.nl/pintura/ghost/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Find out more &rarr;</a>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">
                <Field orientation="horizontal">
                    <FieldContent>
                        <FieldLabel htmlFor="pintura-enabled">Enable Pintura</FieldLabel>
                        <FieldDescription>Enable <a className="text-state-success" href="https://pqina.nl/pintura/ghost/?ref=ghost.org" rel="noopener noreferrer" target="_blank">Pintura</a> for editing your images in Ghost</FieldDescription>
                    </FieldContent>
                    <Switch checked={enabled} id="pintura-enabled" onCheckedChange={setEnabled} />
                </Field>
                {enabled && !config?.pintura && (
                    <>
                        <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
                            <div>
                                <div className="text-sm font-medium">Upload Pintura script</div>
                                <div className="text-sm text-muted-foreground">Upload the <code>pintura-umd.js</code> file from the Pintura package</div>
                            </div>
                            <input ref={jsUploadRef} accept=".js" type="file" hidden onChange={(e) => void handleUpload(e, "js")} />
                            <Button disabled={uploadingState.js} variant="outline" onClick={() => jsUploadRef.current?.click()}>Upload</Button>
                        </div>
                        <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
                            <div>
                                <div className="text-sm font-medium">Upload Pintura styles</div>
                                <div className="text-sm text-muted-foreground">Upload the <code>pintura.css</code> file from the Pintura package</div>
                            </div>
                            <input ref={cssUploadRef} accept=".css" type="file" hidden onChange={(e) => void handleUpload(e, "css")} />
                            <Button disabled={uploadingState.css} variant="outline" onClick={() => cssUploadRef.current?.click()}>Upload</Button>
                        </div>
                    </>
                )}
            </div>
        </IntegrationDialog>
    );
}
