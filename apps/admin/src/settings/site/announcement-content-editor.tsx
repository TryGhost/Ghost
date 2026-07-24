import { Suspense, lazy, useCallback } from "react";

/**
 * The announcement content editor: Koenig with minimal nodes emitting HTML,
 * loaded the same way the rest of the native admin loads the editor (direct
 * ESM import of @tryghost/koenig-lexical) — the native equivalent of the
 * legacy HtmlField wiring through the old design system's provider.
 */

// @tryghost/koenig-lexical ships no type declarations; declare just the
// surface this editor uses (same approach as automations' email-editor).
interface KoenigHtmlOutputPluginProps {
    html?: string;
    setHtml?: (html: string) => void;
}

interface KoenigModule {
    KoenigComposer: React.ComponentType<{ nodes: unknown; onError: (error: unknown) => void; children: React.ReactNode }>;
    KoenigComposableEditor: React.ComponentType<{
        className?: string;
        isSnippetsEnabled?: boolean;
        markdownTransformers?: unknown;
        placeholderClassName?: string;
        placeholderText?: string;
        singleParagraph?: boolean;
        children?: React.ReactNode;
    }>;
    HtmlOutputPlugin: React.ComponentType<KoenigHtmlOutputPluginProps>;
    MINIMAL_NODES: unknown;
    MINIMAL_TRANSFORMERS: unknown;
}

const koenigModulePromise = import("@tryghost/koenig-lexical") as Promise<KoenigModule>;

const LazyKoenigHtmlEditor = lazy(async () => {
    const koenig: KoenigModule = await koenigModulePromise;

    function KoenigHtmlEditor({ value, placeholder, onChange }: {
        value?: string;
        placeholder?: string;
        onChange?: (html: string) => void;
    }) {
        const handleSetHtml = (html: string) => {
            // Strip the white-space styles Lexical scatters (see
            // facebook/lexical#4255), matching the legacy HtmlEditor.
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const elements = doc.querySelectorAll<HTMLElement>("*");

            elements.forEach((element) => {
                element.style.removeProperty("white-space");
                if (!element.getAttribute("style")) {
                    element.removeAttribute("style");
                }
            });

            // Koenig fires this on load without changing the value; skipping
            // the echo keeps the form from being marked unsaved.
            if (doc.body.innerHTML !== value) {
                onChange?.(doc.body.innerHTML);
            }
        };

        return (
            <koenig.KoenigComposer
                nodes={koenig.MINIMAL_NODES}
                onError={(error: unknown) => console.error(error)} // eslint-disable-line no-console
            >
                <koenig.KoenigComposableEditor
                    className="koenig-lexical koenig-lexical-editor-input"
                    isSnippetsEnabled={false}
                    markdownTransformers={koenig.MINIMAL_TRANSFORMERS}
                    placeholderClassName="koenig-lexical-editor-input-placeholder line-clamp-1"
                    placeholderText={placeholder}
                    singleParagraph={true}
                >
                    <koenig.HtmlOutputPlugin html={value} setHtml={handleSetHtml} />
                </koenig.KoenigComposableEditor>
            </koenig.KoenigComposer>
        );
    }

    return { default: KoenigHtmlEditor };
});

export function AnnouncementContentEditor({ value, placeholder, onChange }: {
    value?: string;
    placeholder?: string;
    onChange: (html: string) => void;
}) {
    const handleChange = useCallback((html: string) => onChange(html), [onChange]);

    return (
        <div className="rounded-md border border-border px-3 py-2 text-sm">
            {/* koenig-react-editor provides the positioning context Koenig's
                absolute placeholder expects (the legacy KoenigEditorBase wrapper) */}
            <div className="koenig-react-editor relative w-full [&_*]:font-inherit! [&_*]:[font-size:inherit]!">
                <Suspense fallback={<p className="text-sm text-muted-foreground">Loading editor...</p>}>
                    <LazyKoenigHtmlEditor placeholder={placeholder} value={value} onChange={handleChange} />
                </Suspense>
            </div>
        </div>
    );
}
