import { useState } from "react";
import { CUSTOM_FONTS } from "@tryghost/custom-fonts";
import {
    Field,
    FieldDescription,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@tryghost/shade/components";
import { LucideIcon, cn, formatNumber } from "@tryghost/shade/utils";
import { APIError } from "@tryghost/admin-x-framework/errors";
import { type SettingValue, getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getImageUrl, useUploadImage } from "@tryghost/admin-x-framework/api/images";
import { useBrowseThemes } from "@tryghost/admin-x-framework/api/themes";

import { ColorPickerField } from "./color-picker-field";
import { UnsplashSelector } from "./unsplash-selector";
import { ImageUpload } from "@/settings/app/shared/image-upload";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The Brand tab of the design dialog, ported from the legacy
 * design-and-branding/global-settings.tsx: accent color, icon/logo/cover
 * uploads (cover with the Unsplash browser) and the typography selects.
 */

export interface BrandSettingValues {
    description: string;
    accentColor: string;
    icon: string | null;
    logo: string | null;
    coverImage: string | null;
    headingFont: string;
    bodyFont: string;
}

interface FontSelectOption {
    className?: string;
    hint?: string;
    label: string;
    value: string;
}

const DEFAULT_FONT = "Theme default";

function FontOption({ option, selected }: { option: FontSelectOption; selected?: boolean }) {
    return (
        <span className={`flex w-full gap-4 ${option.className ?? ""}`} data-testid={selected ? "select-current-option" : "select-option"} data-value={option.value}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-2xl font-bold">Aa</span>
            <span className="flex min-w-0 flex-col">
                <span className="text-md">{option.label}</span>
                <span className="truncate font-sans text-sm font-normal text-muted-foreground">{option.hint}</span>
            </span>
        </span>
    );
}

const capitalizeWords = (str: string): string => str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Font-name → utility class mapping kept from the legacy component: Tailwind
// needs the literal class names in source to generate them.
const fontClassName = (fontName: string, heading: boolean = true) => {
    switch (fontName) {
    case "Cardo": return cn("font-cardo", heading && "font-bold");
    case "Manrope": return cn("font-manrope", heading && "font-bold");
    case "Merriweather": return cn("font-merriweather", heading && "font-bold");
    case "Nunito": return cn("font-nunito", heading && "font-semibold");
    case "Old Standard TT": return cn("font-old-standard-tt", heading && "font-bold");
    case "Prata": return cn("font-prata", heading && "font-normal");
    case "Roboto": return cn("font-roboto", heading && "font-bold");
    case "Rufina": return cn("font-rufina", heading && "font-bold");
    case "Tenor Sans": return cn("font-tenor-sans", heading && "font-normal");
    case "Chakra Petch": return cn("font-chakra-petch", heading && "font-normal");
    case "Fira Mono": return cn("font-fira-mono", heading && "font-bold");
    case "Fira Sans": return cn("font-fira-sans", heading && "font-bold");
    case "IBM Plex Serif": return cn("font-ibm-plex-serif", heading && "font-bold");
    case "Inter": return cn("font-inter", heading && "font-bold");
    case "JetBrains Mono": return cn("font-jetbrains-mono", heading && "font-bold");
    case "Lora": return cn("font-lora", heading && "font-bold");
    case "Noto Sans": return cn("font-noto-sans", heading && "font-bold");
    case "Noto Serif": return cn("font-noto-serif", heading && "font-bold");
    case "Poppins": return cn("font-poppins", heading && "font-bold");
    case "Space Grotesk": return cn("font-space-grotesk", heading && "font-bold");
    case "Space Mono": return cn("font-space-mono", heading && "font-bold");
    default: return "";
    }
};

export function BrandSettings({ values, updateSetting }: {
    values: BrandSettingValues;
    updateSetting: (key: string, value: SettingValue) => void;
}) {
    const { mutateAsync: uploadImage } = useUploadImage();
    const { data: settingsData } = useBrowseSettings();
    const [unsplashEnabled] = getSettingValues<boolean>(settingsData?.settings ?? [], ["unsplash"]);
    const [showUnsplash, setShowUnsplash] = useState(false);
    const handleError = useSettingsHandleError();

    const { data: themesData } = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme) => theme.active);
    const themeNameVersion = activeTheme ? `${capitalizeWords(activeTheme.name)} (v${activeTheme.package?.version || "1.0"})` : "Loading...";

    const [headingFont, setHeadingFont] = useState(CUSTOM_FONTS.heading.find((f) => f.name === values.headingFont) || { name: DEFAULT_FONT, creator: themeNameVersion });
    const [bodyFont, setBodyFont] = useState(CUSTOM_FONTS.body.find((f) => f.name === values.bodyFont) || { name: DEFAULT_FONT, creator: themeNameVersion });

    const uploadHandler = (key: string) => async (file: File) => {
        try {
            updateSetting(key, getImageUrl(await uploadImage({ file })));
        } catch (e) {
            const error = e as APIError;
            if (error instanceof APIError && error.response?.status === 415) {
                error.message = "Unsupported file type";
            }
            handleError(error);
        }
    };

    const customHeadingFonts: FontSelectOption[] = CUSTOM_FONTS.heading.map((font) => ({ label: font.name, value: font.name, hint: font.creator, className: fontClassName(font.name, true) }));
    customHeadingFonts.unshift({ label: DEFAULT_FONT, value: DEFAULT_FONT, hint: themeNameVersion, className: "font-sans font-normal" });

    const customBodyFonts: FontSelectOption[] = CUSTOM_FONTS.body.map((font) => ({ label: font.name, value: font.name, hint: font.creator, className: fontClassName(font.name, false) }));
    customBodyFonts.unshift({ label: DEFAULT_FONT, value: DEFAULT_FONT, hint: themeNameVersion, className: "font-sans font-normal" });

    const selectFont = (fontName: string, heading: boolean) => (fontName === DEFAULT_FONT ? "" : fontClassName(fontName, heading));

    const selectedHeadingFont = customHeadingFonts.find((option) => option.value === headingFont.name) || customHeadingFonts[0];
    const selectedBodyFont = customBodyFonts.find((option) => option.value === bodyFont.name) || customBodyFonts[0];

    return (
        <div className="flex flex-col">
            <div className="mt-6 flex flex-col gap-4">
                <ColorPickerField
                    debounceMs={200}
                    direction="rtl"
                    testId="accent-color-picker"
                    title={<div>Accent color</div>}
                    value={values.accentColor}
                    // debounced because the color picker fires a lot of events
                    onChange={(value) => updateSetting("accent_color", value)}
                />
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm font-medium">Publication icon</div>
                        <FieldDescription className="mr-5 max-w-[160px]">A square, social icon, at least {formatNumber(60)}×{formatNumber(60)}px</FieldDescription>
                    </div>
                    <ImageUpload
                        containerClassName={values.icon ? "h-[66px] w-[66px]" : undefined}
                        deleteButtonClassName="top-1 right-1 size-6"
                        fileUploadClassName="h-[36px] w-[160px] cursor-pointer text-sm"
                        id="logo"
                        imageClassName="size-full object-contain"
                        imageURL={values.icon || ""}
                        onDelete={() => updateSetting("icon", null)}
                        onUpload={uploadHandler("icon")}
                    >
                        Upload icon
                    </ImageUpload>
                </div>
                <div className={cn("flex items-start justify-between", values.icon && "mt-2")}>
                    <div>
                        <div className="text-sm font-medium">Publication logo</div>
                        <FieldDescription className="mr-5 max-w-[160px]">Appears usually in the main header of your theme</FieldDescription>
                    </div>
                    <ImageUpload
                        containerClassName="h-[60px] w-[160px]"
                        deleteButtonClassName="top-1 right-1 size-6"
                        fileUploadClassName="h-[60px] w-[160px] cursor-pointer text-sm"
                        id="site-logo"
                        imageClassName="size-full object-contain"
                        imageURL={values.logo || ""}
                        onDelete={() => updateSetting("logo", null)}
                        onUpload={uploadHandler("logo")}
                    >
                        Upload logo
                    </ImageUpload>
                </div>
                <div className="mt-2 flex items-start justify-between" data-testid="publication-cover">
                    <div>
                        <div className="text-sm font-medium">Publication cover</div>
                        <FieldDescription className="mr-5 max-w-[160px]">Usually as a large banner image on your index pages</FieldDescription>
                    </div>
                    <div className="relative">
                        {!values.coverImage && unsplashEnabled && (
                            <button
                                aria-label="Search Unsplash"
                                className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded bg-transparent"
                                data-testid="toggle-unsplash-button"
                                type="button"
                                onClick={() => setShowUnsplash(true)}
                            >
                                <LucideIcon.Camera className="size-4" />
                            </button>
                        )}
                        <ImageUpload
                            containerClassName="h-[95px] w-[160px]"
                            deleteButtonClassName="top-1 right-1 size-6"
                            fileUploadClassName="h-[95px] w-[160px] cursor-pointer text-sm"
                            id="cover"
                            imageClassName="size-full object-cover"
                            imageURL={values.coverImage || ""}
                            onDelete={() => updateSetting("cover_image", null)}
                            onUpload={uploadHandler("cover_image")}
                        >
                            Upload cover
                        </ImageUpload>
                    </div>
                    {showUnsplash && unsplashEnabled && (
                        <UnsplashSelector
                            onClose={() => setShowUnsplash(false)}
                            onImageInsert={(image) => {
                                if (image.src) {
                                    updateSetting("cover_image", image.src);
                                }
                                setShowUnsplash(false);
                            }}
                        />
                    )}
                </div>
            </div>
            <div className="mt-8 flex flex-col gap-4">
                <h3 className="text-base font-semibold">Typography</h3>
                <Field>
                    <FieldLabel>Heading font</FieldLabel>
                    <Select value={selectedHeadingFont.value} onValueChange={(value) => {
                        if (value === DEFAULT_FONT) {
                            setHeadingFont({ name: DEFAULT_FONT, creator: themeNameVersion });
                            updateSetting("heading_font", "");
                        } else {
                            setHeadingFont({ name: value, creator: CUSTOM_FONTS.heading.find((f) => f.name === value)?.creator || "" });
                            updateSetting("heading_font", value);
                        }
                    }}>
                        <SelectTrigger aria-label="Heading font" className={`h-16 pl-2 ${selectFont(selectedHeadingFont.label, true)}`} data-testid="heading-font-select">
                            <SelectValue><FontOption option={selectedHeadingFont} selected /></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {customHeadingFonts.map((option) => <SelectItem key={option.value} value={option.value}><FontOption option={option} /></SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel>Body font</FieldLabel>
                    <Select value={selectedBodyFont.value} onValueChange={(value) => {
                        if (value === DEFAULT_FONT) {
                            setBodyFont({ name: DEFAULT_FONT, creator: themeNameVersion });
                            updateSetting("body_font", "");
                        } else {
                            setBodyFont({ name: value, creator: CUSTOM_FONTS.body.find((f) => f.name === value)?.creator || "" });
                            updateSetting("body_font", value);
                        }
                    }}>
                        <SelectTrigger aria-label="Body font" className={`h-16 pl-2 ${selectFont(selectedBodyFont.label, false)}`} data-testid="body-font-select">
                            <SelectValue><FontOption option={selectedBodyFont} selected /></SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-52">
                            {customBodyFonts.map((option) => <SelectItem key={option.value} value={option.value}><FontOption option={option} /></SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
            </div>
        </div>
    );
}
