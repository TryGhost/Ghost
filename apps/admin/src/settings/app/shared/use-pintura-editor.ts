import { useCallback, useEffect, useRef, useState } from "react";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";

/**
 * The legacy use-pintura-editor hook on the framework hooks: loads the
 * Pintura script/css from config (Pro) or the uploaded-file settings
 * (self-host), reports `isEnabled` only once both actually loaded, and
 * opens the editor over an image. Load errors are non-fatal — the
 * integration just stays inactive, like legacy.
 */

interface OpenEditorParams {
    image: string;
    handleSave: (dest: File) => void | Promise<void>;
}

type FrameOptionType = "solidSharp" | "solidRound" | "lineSingle" | "hook" | "polaroid" | undefined;

interface PinturaLocale {
    labelNone: string;
    frameLabelMatSharp: string;
    frameLabelMatRound: string;
    frameLabelLineSingle: string;
    frameLabelCornerHooks: string;
    frameLabelPolaroid: string;
    labelButtonExport: string;
}

interface PinturaGlobal {
    openDefaultEditor: (params: {
        src: string;
        enableTransparencyGrid: boolean;
        util: string;
        utils: string[];
        frameOptions: [FrameOptionType, (locale: PinturaLocale) => string][];
        cropSelectPresetFilter: string;
        cropSelectPresetOptions: [number | undefined, string][];
        locale: {
            labelButtonExport: string;
        };
        previewPad: boolean;
        willClose: () => boolean;
    }) => {
        on: (event: string, callback: (result: { dest: File }) => void) => void;
    };
}

const getPintura = (): PinturaGlobal | undefined => (window as Window & { pintura?: PinturaGlobal }).pintura;

export function usePinturaEditor() {
    const { data: settingsData } = useBrowseSettings();
    const { data: configData } = useBrowseConfig();
    const settings = settingsData?.settings ?? [];
    const [pintura] = getSettingValues<boolean>(settings, ["pintura"]);
    const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
    const [cssLoaded, setCssLoaded] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const allowClose = useRef<boolean>(false);
    const [pinturaJsUrl] = getSettingValues<string>(settings, ["pintura_js_url"]);
    const [pinturaCssUrl] = getSettingValues<string>(settings, ["pintura_css_url"]);

    const isEnabled = (pintura && scriptLoaded && cssLoaded) || false;
    const pinturaConfig = configData?.config?.pintura as { js?: string; css?: string } | undefined;
    const pinturaConfigJs = pinturaConfig?.js;
    const pinturaConfigCss = pinturaConfig?.css;

    useEffect(() => {
        let jsUrl = pinturaConfigJs || pinturaJsUrl || null;

        if (!jsUrl) {
            return;
        }

        // load the script from admin root if relative
        if (jsUrl.startsWith("/")) {
            const { adminRoot } = getGhostPaths();
            jsUrl = window.location.origin + adminRoot.replace(/\/$/, "") + jsUrl;
        }

        if (getPintura()) {
            setScriptLoaded(true);
            return;
        }

        try {
            const url = new URL(jsUrl);
            const importUrl = `${url.protocol}//${url.host}${url.pathname}`;
            import(/* @vite-ignore */ importUrl)
                .then(() => {
                    setScriptLoaded(true);
                })
                .catch(() => {
                    // Failed loads keep the integration inactive.
                });
        } catch {
            // Invalid URLs keep the integration inactive.
        }
    }, [pinturaJsUrl, pinturaConfigJs]);

    useEffect(() => {
        let cssUrl = pinturaConfigCss || pinturaCssUrl || null;

        if (!cssUrl) {
            return;
        }

        if (cssUrl.startsWith("/")) {
            const { adminRoot } = getGhostPaths();
            cssUrl = window.location.origin + adminRoot.replace(/\/$/, "") + cssUrl;
        }

        // Reuse the stylesheet if it's already in the document's head.
        const cssLink = document.querySelector(`link[href="${cssUrl}"]`);
        if (cssLink) {
            setCssLoaded(true);
        } else {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = cssUrl;
            link.onload = () => {
                setCssLoaded(true);
            };
            document.head.appendChild(link);
        }
    }, [pinturaCssUrl, pinturaConfigCss]);

    const openEditor = useCallback(
        ({ image, handleSave }: OpenEditorParams) => {
            const pinturaGlobal = getPintura();
            if (image && isEnabled && pinturaGlobal) {
                const imageUrl = new URL(image);
                if (!imageUrl.searchParams.has("v")) {
                    imageUrl.searchParams.set("v", Date.now().toString());
                }

                const imageSrc = imageUrl.href;

                const editor = pinturaGlobal.openDefaultEditor({
                    src: imageSrc,
                    enableTransparencyGrid: true,
                    util: "crop",
                    utils: [
                        "crop",
                        "filter",
                        "finetune",
                        "redact",
                        "annotate",
                        "trim",
                        "frame",
                        "resize",
                    ],
                    frameOptions: [
                        // No frame
                        [undefined, (locale) => locale.labelNone],

                        // Sharp edge frame
                        ["solidSharp", (locale) => locale.frameLabelMatSharp],

                        // Rounded edge frame
                        ["solidRound", (locale) => locale.frameLabelMatRound],

                        // A single line frame
                        ["lineSingle", (locale) => locale.frameLabelLineSingle],

                        // A frame with corner hooks
                        ["hook", (locale) => locale.frameLabelCornerHooks],

                        // A polaroid frame
                        ["polaroid", (locale) => locale.frameLabelPolaroid],
                    ],
                    cropSelectPresetFilter: "landscape",
                    cropSelectPresetOptions: [
                        [undefined, "Custom"],
                        [1, "Square"],
                        // shown when cropSelectPresetFilter is set to 'landscape'
                        [2 / 1, "2:1"],
                        [3 / 2, "3:2"],
                        [4 / 3, "4:3"],
                        [16 / 10, "16:10"],
                        [16 / 9, "16:9"],
                        // shown when cropSelectPresetFilter is set to 'portrait'
                        [1 / 2, "1:2"],
                        [2 / 3, "2:3"],
                        [3 / 4, "3:4"],
                        [10 / 16, "10:16"],
                        [9 / 16, "9:16"],
                    ],
                    locale: {
                        labelButtonExport: "Save and close",
                    },
                    previewPad: true,
                    // Skip default Escape to close behaviour, only allow when the close button is clicked
                    willClose: () => {
                        if (allowClose.current) {
                            setIsOpen(false);
                            return true;
                        }

                        return false;
                    },
                });

                editor.on("process", (result) => {
                    void handleSave(result.dest);
                });

                setIsOpen(true);
            }
        },
        [isEnabled],
    );

    // Only allow closing the modal if the close button was clicked
    useEffect(() => {
        const handleEscapePress = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
            }
        };
        if (!isOpen) {
            return;
        }

        const handleCloseClick = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('.PinturaModal button[title="Close"]')) {
                allowClose.current = true;
            }
        };

        window.addEventListener("click", handleCloseClick, { capture: true });
        window.addEventListener("keydown", handleEscapePress, { capture: true });

        return () => {
            window.removeEventListener("click", handleCloseClick, { capture: true });
            window.removeEventListener("keydown", handleEscapePress, { capture: true });
        };
    }, [isOpen]);

    return {
        isEnabled,
        openEditor,
    };
}
