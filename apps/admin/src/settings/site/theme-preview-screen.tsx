import { useState } from "react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    Button,
    Field,
    FieldLabel,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@tryghost/shade/components";
import { type Theme, isDefaultOrLegacyTheme } from "@tryghost/admin-x-framework/api/themes";

import { type OfficialTheme, getAllVariants, hasVariants } from "./official-themes";
import { DesktopChromeFrame, MobileChromeFrame, type PreviewDevice, PreviewDeviceToggle } from "./preview-chrome";

/**
 * The official-theme preview overlay inside the change-theme dialog, ported
 * from the legacy theme/theme-preview.tsx: breadcrumb back, variant select,
 * device toggle, and the install/update/activate action.
 */

const generateVariantOptionValue = (variant: { category: string }) => variant.category.toLowerCase();

export function ThemePreviewScreen({ selectedTheme, isInstalling, installedTheme, onBack, onInstall }: {
    selectedTheme: OfficialTheme;
    isInstalling?: boolean;
    installedTheme?: Theme;
    onBack: () => void;
    onInstall?: () => void | Promise<void>;
}) {
    const [previewMode, setPreviewMode] = useState<PreviewDevice>("desktop");
    const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);

    let previewUrl = selectedTheme.previewUrl;

    const variantOptions = getAllVariants(selectedTheme).map((variant) => ({
        label: variant.category,
        value: generateVariantOptionValue(variant),
    }));

    const activeVariant = hasVariants(selectedTheme) ? (selectedVariant ?? variantOptions[0].value) : undefined;
    if (activeVariant) {
        previewUrl = getAllVariants(selectedTheme).find((variant) => generateVariantOptionValue(variant) === activeVariant)?.previewUrl || previewUrl;
    }

    let installButtonLabel = `Install ${selectedTheme.name}`;

    if (isInstalling) {
        installButtonLabel = "Installing...";
    } else if (isDefaultOrLegacyTheme(selectedTheme) && !installedTheme?.active) {
        installButtonLabel = `Activate ${selectedTheme.name}`;
    } else if (installedTheme) {
        installButtonLabel = `Update ${selectedTheme.name}`;
    }

    const iframe = <iframe className="size-full" src={previewUrl} title="Theme preview" />;

    return (
        <div className="absolute inset-0 z-[100] flex flex-col bg-muted">
            <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 px-6">
                <div className="flex items-center gap-2">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <button className="cursor-pointer" type="button" onClick={onBack}>Change theme</button>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{selectedTheme.name}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    {activeVariant !== undefined && (
                        <>
                            <span className="hidden md:block">–</span>
                            <Field className="w-auto">
                                <FieldLabel className="sr-only">Theme variant</FieldLabel>
                                <Select value={activeVariant} onValueChange={setSelectedVariant}>
                                    <SelectTrigger aria-label="Theme variant" className="w-auto border-0 bg-transparent shadow-none"><SelectValue /></SelectTrigger>
                                    <SelectContent className="min-w-max">
                                        {variantOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </>
                    )}
                </div>
                <div className="flex items-center justify-end gap-4">
                    <PreviewDeviceToggle device={previewMode} onChange={setPreviewMode} />
                    <Button disabled={isInstalling} variant="default" onClick={() => void onInstall?.()}>
                        {installButtonLabel}
                    </Button>
                </div>
            </header>
            <div className="flex min-h-0 grow flex-col items-center justify-center pb-6">
                {previewMode === "desktop" ? (
                    <DesktopChromeFrame>{iframe}</DesktopChromeFrame>
                ) : (
                    <MobileChromeFrame>{iframe}</MobileChromeFrame>
                )}
            </div>
        </div>
    );
}
