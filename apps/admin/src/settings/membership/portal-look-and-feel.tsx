import { useRef, useState } from "react";
import {
    Button,
    Field,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    ToggleGroup,
    ToggleGroupItem,
} from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { type Setting, type SettingValue, getSettingValues } from "@tryghost/admin-x-framework/api/settings";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";

import { PortalButtonIcon } from "./portal-icons";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Look & feel tab of the portal dialog, ported from the legacy
 * portal/look-and-feel.tsx: portal button toggle, style select, built-in /
 * uploaded icon choice and the signup button text.
 */

const defaultButtonIcons = [
    { icon: "icon-1", label: "Portal icon 1", value: "icon-1" },
    { icon: "icon-2", label: "Portal icon 2", value: "icon-2" },
    { icon: "icon-3", label: "Portal icon 3", value: "icon-3" },
    { icon: "icon-4", label: "Portal icon 4", value: "icon-4" },
    { icon: "icon-5", label: "Portal icon 5", value: "icon-5" },
];

export function PortalLookAndFeel({ localSettings, updateSetting }: {
    localSettings: Setting[];
    updateSetting: (key: string, setting: SettingValue) => void;
}) {
    const { mutateAsync: uploadImage } = useUploadImage();
    const handleError = useSettingsHandleError();
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const [portalButton, portalButtonStyle, portalButtonIcon, portalButtonSignupText] = getSettingValues(localSettings, ["portal_button", "portal_button_style", "portal_button_icon", "portal_button_signup_text"]);

    const currentIcon = portalButtonIcon as string || defaultButtonIcons[0].value;
    const isDefaultIcon = defaultButtonIcons.map(({ value }) => value).includes(currentIcon);

    const [uploadedIcon, setUploadedIcon] = useState(isDefaultIcon ? undefined : currentIcon);

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({ file }));
            updateSetting("portal_button_icon", imageUrl);
            setUploadedIcon(imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = "Unsupported file type";
            }
            handleError(error);
        }
    };

    const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            void handleImageUpload(file);
        }
        event.target.value = "";
    };

    const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) {
            void handleImageUpload(file);
        }
    };

    const handleImageDelete = () => {
        if (currentIcon === uploadedIcon) {
            updateSetting("portal_button_icon", null);
        }
        setUploadedIcon(undefined);
    };

    const portalButtonOptions = [
        { value: "icon-and-text", label: "Icon and text" },
        { value: "icon-only", label: "Icon only" },
        { value: "text-only", label: "Text only" },
    ];

    return (
        <div className="mt-7 flex flex-col gap-6">
            <Field orientation="horizontal">
                <FieldLabel htmlFor="show-portal-button">Show portal button</FieldLabel>
                <Switch checked={Boolean(portalButton)} id="show-portal-button" onCheckedChange={(checked) => updateSetting("portal_button", checked)} />
            </Field>

            {Boolean(portalButton) && (
                <>
                    <Field>
                        <FieldLabel>Button style</FieldLabel>
                        <Select value={portalButtonStyle as string} onValueChange={(value) => updateSetting("portal_button_style", value)}>
                            <SelectTrigger aria-label="Button style"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {portalButtonOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    {portalButtonStyle?.toString()?.includes("icon") && (
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Icon</span>
                            <div className="flex items-center justify-between gap-2">
                                <ToggleGroup
                                    aria-label="Portal button icon"
                                    className="flex-1 justify-between border-0! bg-transparent! p-0"
                                    type="single"
                                    value={currentIcon}
                                    onValueChange={(value) => value && updateSetting("portal_button_icon", value)}
                                >
                                    {defaultButtonIcons.map((iconConfig) => (
                                        <ToggleGroupItem key={iconConfig.value} aria-label={iconConfig.label} className="size-[46px] p-3" value={iconConfig.value}>
                                            <PortalButtonIcon className="size-5 opacity-70 transition-all hover:opacity-100" icon={iconConfig.icon} />
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                                <div
                                    className={cn("relative size-[46px] border", currentIcon === uploadedIcon ? "border-primary" : "border-transparent")}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={handleImageDrop}
                                >
                                    <input ref={uploadInputRef} type="file" hidden onChange={handleImageInputChange} />
                                    {uploadedIcon ? (
                                        <>
                                            <img alt="" className="size-full object-cover" src={uploadedIcon} />
                                            <Button
                                                aria-label="Use uploaded Portal icon"
                                                aria-pressed={currentIcon === uploadedIcon}
                                                className="absolute inset-0 z-10 size-full rounded-none bg-transparent"
                                                size="icon"
                                                type="button"
                                                variant="ghost"
                                                onClick={() => updateSetting("portal_button_icon", uploadedIcon)}
                                            />
                                            <Button
                                                aria-label="Delete uploaded Portal icon"
                                                className="bg-surface-inverse text-surface-inverse-foreground hover:bg-surface-inverse/90 absolute -top-2 -right-2 z-20 size-6 rounded-full p-0"
                                                size="icon"
                                                type="button"
                                                variant="ghost"
                                                onClick={handleImageDelete}
                                            >
                                                <LucideIcon.Trash2 className="size-3.5" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            aria-label="Upload Portal icon"
                                            className="size-full"
                                            size="icon"
                                            type="button"
                                            variant="outline"
                                            onClick={() => uploadInputRef.current?.click()}
                                        >
                                            <LucideIcon.Upload className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {portalButtonStyle?.toString()?.includes("text") && (
                        <TextField
                            title="Signup button text"
                            value={portalButtonSignupText as string}
                            onChange={(e) => updateSetting("portal_button_signup_text", e.target.value)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
