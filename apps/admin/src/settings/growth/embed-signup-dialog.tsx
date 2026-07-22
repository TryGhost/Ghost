import { useCallback, useEffect, useRef, useState } from "react";
import {
    Button,
    Combobox,
    ComboboxContent,
    ComboboxTrigger,
    ComboboxValue,
    Dialog,
    DialogContent,
    DialogTitle,
    Field,
    FieldDescription,
    FieldLabel,
    MultiSelectCombobox,
    Textarea,
    ToggleGroup,
    ToggleGroupItem,
} from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useFilterableApi } from "@tryghost/admin-x-framework/hooks";
import { useNavigate } from "@tryghost/admin-x-framework";
import type { Label } from "@tryghost/admin-x-framework/api/labels";
import IframeBuffering from "@tryghost/admin-x-settings/src/utils/iframe-buffering";
import { generateCode } from "@tryghost/admin-x-settings/src/utils/generate-embed-code";

import { ColorPickerField } from "@/settings/site/color-picker-field";

/**
 * The routed embed-signup dialog (`/settings/embed-signup-form/show`), ported
 * from the legacy embed-signup/embed-signup-form-modal.tsx: layout/color/label
 * customization beside the live iframe preview, with the generated embed code
 * ready to copy.
 */

type SelectedLabel = { label: string; value: string };

function EmbedSignupPreview({ html, style }: { html: string; style: string }) {
    const generateContentForEmbed = (iframe: HTMLIFrameElement) => {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
            return;
        }

        const docString = `
            <html>
                <head>
                    <style>body, html {padding: 0; margin: 0; overflow: hidden;}</style>
                    <style>${style}</style>
                </head>
                <body>${html}</body>
            </html>
        `;

        iframeDoc.open();
        iframeDoc.write(docString);
        iframeDoc.close();
    };

    return (
        <IframeBuffering
            className="absolute size-full overflow-hidden transition-opacity duration-500"
            generateContent={generateContentForEmbed}
            height="100%"
            parentClassName="relative h-full min-h-[400px] w-full"
            width="100%"
        />
    );
}

function LabelsCombobox({ selectedLabels, onChange }: {
    selectedLabels: SelectedLabel[];
    onChange: (selected: string[]) => void;
}) {
    const { loadData } = useFilterableApi<Label>({ path: "/labels/", filterKey: "name", responseKey: "labels" });
    const [labelOptions, setLabelOptions] = useState<SelectedLabel[]>(selectedLabels || []);
    const [labelsOpen, setLabelsOpen] = useState(false);
    const [labelsLoading, setLabelsLoading] = useState(false);
    const requestSequence = useRef(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadDataRef = useRef(loadData);
    const selectedLabelsRef = useRef(selectedLabels);
    loadDataRef.current = loadData;
    selectedLabelsRef.current = selectedLabels;

    const loadOptions = useCallback(async (input: string, request: number) => {
        const currentSelectedLabels = selectedLabelsRef.current || [];
        try {
            const labels = await loadDataRef.current(input);
            const loadedOptions = labels.map((label) => ({ label: label.name, value: label.name }));
            if (request === requestSequence.current) {
                setLabelOptions([...currentSelectedLabels, ...loadedOptions.filter((option) => !currentSelectedLabels.some((selected) => selected.value === option.value))]);
            }
        } catch {
            if (request === requestSequence.current) {
                setLabelOptions(currentSelectedLabels);
            }
        } finally {
            if (request === requestSequence.current) {
                setLabelsLoading(false);
            }
        }
    }, []);

    const requestOptions = useCallback((input: string, deferred = false) => {
        requestSequence.current += 1;
        const request = requestSequence.current;
        setLabelsLoading(true);
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }
        if (deferred) {
            searchTimer.current = setTimeout(() => void loadOptions(input, request), 500);
        } else {
            void loadOptions(input, request);
        }
    }, [loadOptions]);

    useEffect(() => {
        setLabelOptions((current) => [...(selectedLabels || []), ...current.filter((option) => !selectedLabels?.some((selected) => selected.value === option.value))]);
    }, [selectedLabels]);

    useEffect(() => {
        return () => {
            requestSequence.current += 1;
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }
        };
    }, []);

    return (
        <Field>
            <FieldLabel>Labels at signup</FieldLabel>
            <Combobox open={labelsOpen} onOpenChange={(open) => {
                setLabelsOpen(open);
                if (open) {
                    requestOptions("");
                }
            }}>
                <ComboboxTrigger aria-label="Labels at signup">
                    <ComboboxValue placeholder={!selectedLabels?.length}>
                        {selectedLabels?.length ? selectedLabels.map((label) => label.label).join(", ") : "Pick one or more labels (optional)"}
                    </ComboboxValue>
                </ComboboxTrigger>
                <ComboboxContent>
                    <MultiSelectCombobox
                        footer={({ searchInput, clearSearch }) => {
                            const value = searchInput.trim();
                            if (labelsLoading || !value || labelOptions.some((option) => option.label.toLowerCase() === value.toLowerCase())) {
                                return null;
                            }
                            return (
                                <div className="border-t p-1">
                                    <button className="flex h-8 w-full items-center justify-start gap-2 rounded-xs px-2 text-sm hover:bg-interactive-hover" type="button" onClick={() => {
                                        const option = { label: value, value };
                                        setLabelOptions((current) => [...current, option]);
                                        onChange([...(selectedLabels || []).map((label) => label.value), value]);
                                        clearSearch();
                                    }}>
                                        <LucideIcon.Plus className="size-4" />
                                        Create &ldquo;{value}&rdquo;
                                    </button>
                                </div>
                            );
                        }}
                        isLoading={labelsLoading}
                        options={labelOptions}
                        values={(selectedLabels || []).map((label) => label.value)}
                        onChange={onChange}
                        onSearchChange={(input) => requestOptions(input, true)}
                    />
                </ComboboxContent>
            </Combobox>
            <FieldDescription>Will be applied to all members signing up via this form</FieldDescription>
        </Field>
    );
}

export function EmbedSignupDialog() {
    const navigate = useNavigate();
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const { data: siteResponse } = useBrowseSite();

    const [selectedColor, setSelectedColor] = useState<string>("#08090c");
    const [selectedLabels, setSelectedLabels] = useState<SelectedLabel[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<string>("all-in-one");
    const [previewScript, setPreviewScript] = useState<string>("");
    const [generatedScript, setGeneratedScript] = useState<string>("");
    const [isCopied, setIsCopied] = useState(false);

    const settings = settingsData?.settings ?? [];
    const config = configData?.config;
    const siteData = siteResponse?.site ?? null;
    const [accentColor, title, description, locale, icon] = getSettingValues<string>(settings, ["accent_color", "title", "description", "locale", "icon"]);

    useEffect(() => {
        if (!siteData) {
            return;
        }

        const defaultConfig = {
            config: {
                blogUrl: siteData.url,
                signupForm: {
                    url: (config?.signupForm)?.url ?? "",
                    version: (config?.signupForm)?.version ?? "",
                },
            },
            settings: {
                accentColor: accentColor || "#d74780",
                title: title || "",
                locale: locale || "en",
                icon: icon || "",
                description: description || "",
            },
            labels: selectedLabels.map(({ label }) => ({ name: label })),
            backgroundColor: selectedColor || "#08090c",
            layout: selectedLayout,
        };

        const previewCode = generateCode({
            preview: true,
            ...defaultConfig,
        });
        setPreviewScript(previewCode);

        const generatedCode = generateCode({
            preview: false,
            ...defaultConfig,
        });
        setGeneratedScript(generatedCode);
    }, [siteData, accentColor, selectedLabels, config, title, selectedColor, selectedLayout, locale, icon, description]);

    const handleCopyClick = async () => {
        try {
            await navigator.clipboard.writeText(generatedScript);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // reset after 2 seconds
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to copy text: ", err);
        }
    };

    const handleClose = () => {
        navigate("/settings/embed-signup-form");
    };

    const addSelectedLabel = (selected: string[]) => {
        if (selected.length) {
            const chosenLabels = selected.map((value) => ({ label: value, value }));
            setSelectedLabels(chosenLabels);
        } else {
            setSelectedLabels([]);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && handleClose()}>
            <DialogContent
                aria-describedby={undefined}
                className="w-[92vw] max-w-[1120px] gap-0 overflow-hidden p-0"
                data-testid="embed-signup-form"
            >
                <DialogTitle className="sr-only">Embed signup form</DialogTitle>
                <button aria-label="Close" className="absolute top-4 right-4 z-10 cursor-pointer rounded-full p-1 text-muted-foreground hover:text-foreground" type="button" onClick={handleClose}>
                    <LucideIcon.X className="size-4" />
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-[5.2fr_2.8fr]">
                    <EmbedSignupPreview html={previewScript} style={selectedLayout} />
                    <div className="flex h-[calc(100vh-16vmin)] max-h-[645px] flex-col justify-between overflow-y-auto border-border p-6 pb-0 max-lg:border-t lg:border-l">
                        <div>
                            <h4 className="mb-8 text-lg font-semibold tracking-tight">Embed signup form</h4>
                            <div className="flex flex-col gap-4">
                                <div className="flex w-full items-center justify-between">
                                    <div>Layout</div>
                                    <ToggleGroup type="single" value={selectedLayout} onValueChange={(value) => {
                                        if (value) {
                                            setSelectedLayout(value);
                                        }
                                    }}>
                                        <ToggleGroupItem value="all-in-one">Branded</ToggleGroupItem>
                                        <ToggleGroupItem value="minimal">Minimal</ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                                {selectedLayout === "all-in-one" && (
                                    <ColorPickerField
                                        direction="rtl"
                                        swatches={[
                                            { hex: "#08090c", title: "Dark", value: "#08090c" },
                                            { hex: "#ffffff", title: "Light", value: "#ffffff" },
                                            { hex: accentColor || "#d74780", title: "Accent", value: accentColor || "#d74780" },
                                        ]}
                                        title="Background color"
                                        value={selectedColor}
                                        onChange={(value) => {
                                            if (value) {
                                                setSelectedColor(value);
                                            }
                                        }}
                                    />
                                )}
                                <LabelsCombobox selectedLabels={selectedLabels} onChange={addSelectedLabel} />
                                <Field>
                                    <FieldLabel htmlFor="embed-signup-code">Embed code</FieldLabel>
                                    <Textarea className="resize-none border-transparent bg-muted font-mono" id="embed-signup-code" value={generatedScript} readOnly />
                                    <FieldDescription>Paste this code onto any website where you&apos;d like your signup to appear.</FieldDescription>
                                </Field>
                            </div>
                        </div>
                        <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-border bg-surface-elevated-2 px-6 py-4">
                            <Button className="lg:hidden" variant="outline" onClick={handleClose}>Close</Button>
                            <Button onClick={() => void handleCopyClick()}>{isCopied ? "Copied!" : "Copy code"}</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
