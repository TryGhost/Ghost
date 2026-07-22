import { useEffect, useState } from "react";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
} from "@tryghost/shade/components";
import { cn } from "@tryghost/shade/utils";
import { type CustomThemeSetting } from "@tryghost/admin-x-framework/api/custom-theme-settings";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { humanizeSettingKey } from "@tryghost/admin-x-framework/api/settings";
import { useActiveTheme, useBrowseThemes } from "@tryghost/admin-x-framework/api/themes";
import { isCustomThemeSettingVisible } from "@tryghost/admin-x-settings/src/utils/is-custom-theme-settings-visible";

import { ColorPickerField } from "./color-picker-field";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { TextField } from "@/settings/app/shared/text-field";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Theme tab of the design dialog, ported from the legacy
 * design-and-branding/theme-settings.tsx + theme-setting.tsx: sections per
 * setting group, nql-visibility filtering, and the official-theme font
 * settings hidden (not removed) once custom fonts are supported.
 */

export interface ThemeSettingSection {
    id: string;
    title: string;
    settings: CustomThemeSetting[];
}

// Typography-related settings hidden from official themes while custom fonts
// are supported; remove once the themes drop these settings in 6.0.
const themeSettingsMap: Record<string, string[]> = {
    source: ["title_font", "body_font"],
    casper: ["title_font", "body_font"],
    alto: ["title_font", "body_font"],
    bulletin: ["title_font", "body_font"],
    dawn: ["title_font", "body_font"],
    digest: ["title_font", "body_font"],
    dope: ["title_font", "body_font"],
    ease: ["title_font", "body_font"],
    edge: ["title_font", "body_font"],
    edition: ["title_font", "body_font"],
    episode: ["typography"],
    headline: ["title_font", "body_font"],
    journal: ["title_font", "body_font"],
    london: ["title_font", "body_font"],
    ruby: ["title_font", "body_font"],
    solo: ["typography"],
    taste: ["style"],
    wave: ["title_font", "body_font"],
};

function ThemeSettingField({ setting, setSetting }: {
    setting: CustomThemeSetting;
    setSetting: (value: CustomThemeSetting["value"]) => void;
}) {
    const [fieldValue, setFieldValue] = useState<string>(setting.value === null ? "" : String(setting.value));
    useEffect(() => {
        setFieldValue(setting.value === null ? "" : String(setting.value));
    }, [setting]);

    const { mutateAsync: uploadImage } = useUploadImage();
    const handleError = useSettingsHandleError();

    const handleImageUpload = async (file: File) => {
        try {
            setSetting(getImageUrl(await uploadImage({ file })));
        } catch (e) {
            handleError(e);
        }
    };

    switch (setting.type) {
    case "text":
        return (
            <TextField
                hint={setting.description}
                title={humanizeSettingKey(setting.key)}
                value={fieldValue}
                onBlur={() => setSetting(fieldValue)}
                onChange={(event) => setFieldValue(event.target.value)}
            />
        );
    case "boolean":
        return (
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldLabel htmlFor={`theme-setting-${setting.key}`}>{humanizeSettingKey(setting.key)}</FieldLabel>
                    {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
                </FieldContent>
                <Switch checked={Boolean(setting.value)} id={`theme-setting-${setting.key}`} onCheckedChange={setSetting} />
            </Field>
        );
    case "select":
        return (
            <Field>
                <FieldLabel>{humanizeSettingKey(setting.key)}</FieldLabel>
                <Select value={setting.value} onValueChange={setSetting}>
                    <SelectTrigger aria-label={humanizeSettingKey(setting.key)} data-testid={`setting-select-${setting.key}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {setting.options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                </Select>
                {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
            </Field>
        );
    case "color":
        return (
            <ColorPickerField
                debounceMs={200}
                direction="rtl"
                hint={setting.description}
                title={humanizeSettingKey(setting.key)}
                value={setting.value || ""}
                onChange={(value) => setSetting(value)}
            />
        );
    case "image":
        return (
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{humanizeSettingKey(setting.key)}</span>
                <ImageUpload
                    containerClassName={setting.value ? "h-[100px]" : undefined}
                    fileUploadClassName="h-[32px] cursor-pointer text-sm"
                    id={`custom-${setting.key}`}
                    imageClassName="size-full object-cover"
                    imageURL={setting.value || ""}
                    onDelete={() => setSetting(null)}
                    onUpload={handleImageUpload}
                >
                    Upload image
                </ImageUpload>
                {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
            </div>
        );
    }
}

export function ThemeSettingsForm({ sections, updateSetting }: {
    sections: ThemeSettingSection[];
    updateSetting: (setting: CustomThemeSetting) => void;
}) {
    const { data: themesData } = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme) => theme.active);
    const activeThemeName = activeTheme?.package.name?.toLowerCase() || "";
    const activeThemeAuthor = activeTheme?.package.author?.name || "";
    const { data: activeThemeData } = useActiveTheme();
    const supportsCustomFonts = !activeThemeData?.themes[0]?.warnings?.some((warning) => (warning as { code?: string }).code === "GS051-CUSTOM-FONTS");

    return (
        <>
            {sections.map((section) => {
                const keyValues = section.settings.reduce<Record<string, string>>((obj, { key, value }) => ({ ...obj, [key]: value as string }), {});
                const filteredSettings = section.settings.filter((setting) => isCustomThemeSettingVisible(setting, keyValues));

                let previousType: string | undefined;

                return (
                    <div key={section.id} className="mt-8 flex flex-col gap-3 first-of-type:mt-6">
                        <h3 className="text-base font-semibold">{section.title}</h3>
                        {filteredSettings.map((setting) => {
                            let spaceClass = "";
                            if (setting.type === "boolean" && previousType !== "boolean" && previousType !== undefined) {
                                spaceClass = "mt-3";
                            }
                            if ((setting.type === "text" || setting.type === "select") && (previousType === "text" || previousType === "select")) {
                                spaceClass = "mt-2";
                            }

                            const hidingSettings = themeSettingsMap[activeThemeName];
                            const hidden = Boolean(hidingSettings?.includes(setting.key) && activeThemeAuthor === "Ghost Foundation" && supportsCustomFonts);

                            previousType = setting.type;
                            return (
                                <div key={setting.key} className={cn(spaceClass, hidden && "hidden")}>
                                    <ThemeSettingField
                                        setSetting={(value) => updateSetting({ ...setting, value } as CustomThemeSetting)}
                                        setting={setting}
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
}
