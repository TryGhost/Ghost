import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@tryghost/shade/utils";

/**
 * The advanced-area CodeMirror field (code injection, redirects/routes
 * editors), replacing the legacy admin-x CodeEditor. The editing surface is
 * fixed-light (like the theme editor's fixed-dark IDE), so it stays readable
 * without a dark CodeMirror theme; the chrome around it uses tokens.
 */

export interface CodeEditorProps {
    language: "html" | "yaml";
    value: string;
    onChange: (value: string) => void;
    hint?: ReactNode;
    testId?: string;
    autoFocus?: boolean;
    className?: string;
}

const loadLanguage = (language: CodeEditorProps["language"]): Promise<Extension> => {
    switch (language) {
    case "yaml":
        return import("@codemirror/lang-yaml").then((module) => module.yaml());
    case "html":
    default:
        return import("@codemirror/lang-html").then((module) => module.html());
    }
};

export function CodeEditor({ language, value, onChange, hint, testId, autoFocus, className }: CodeEditorProps) {
    const [extensions, setExtensions] = useState<Extension[] | null>(null);

    useEffect(() => {
        let isMounted = true;
        loadLanguage(language).then((extension) => {
            if (isMounted) {
                setExtensions([extension]);
            }
        }).catch(() => {
            if (isMounted) {
                setExtensions([]);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [language]);

    if (!extensions) {
        return <div className={cn("flex min-h-0 flex-auto flex-col", className)} data-testid={testId} />;
    }

    return (
        <div className={cn("flex min-h-0 flex-auto flex-col", className)} data-testid={testId}>
            <CodeMirror
                basicSetup={{ crosshairCursor: false, searchKeymap: false }}
                className="min-h-0 w-full grow basis-0 overflow-hidden rounded-sm border border-border bg-white [&_.cm-activeLine]:bg-transparent [&_.cm-activeLineGutter]:bg-transparent [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-gutters]:border-neutral-200 [&_.cm-gutters]:bg-neutral-50 [&_.cm-gutters]:text-neutral-500 [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:font-mono"
                extensions={extensions}
                height="100%"
                value={value}
                autoFocus={autoFocus}
                onChange={onChange}
            />
            {hint && <p className="mt-1 shrink-0 text-sm text-muted-foreground">{hint}</p>}
        </div>
    );
}
