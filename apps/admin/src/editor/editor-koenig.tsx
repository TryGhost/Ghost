/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { koenigFileUploadTypes, useKoenigFetchEmbed, useKoenigFileUpload, useKoenigLinkSuggestions } from "@tryghost/admin-x-framework";
import { useBrowseLabels } from "@tryghost/admin-x-framework/api/labels";
import { getSettingValue, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { fetchKoenigLexical } from "@/utils/fetch-koenig-lexical";

/**
 * Imperative API registered by the Koenig editor (subset the editor screen
 * uses; see KoenigInstance in admin-x-design-system for the full surface).
 */
export interface KoenigEditorAPI {
    focusEditor: (options?: { position?: "top" | "bottom" }) => void;
}

export interface EditorKoenigProps {
    /** Serialized lexical state the editor is seeded with (uncontrolled afterwards). */
    initialEditorState: string | null;
    placeholderText: string;
    onChange: (lexicalJson: string) => void;
    registerAPI: (api: KoenigEditorAPI | null) => void;
}

/* Suspense resource around the dynamic Koenig import (same pattern as the
 * Ember koenig service and admin-x-design-system's loadKoenig). */
let koenigModule: any = null;
let koenigPromise: Promise<void> | null = null;

function readKoenig(): any {
    if (koenigModule) {
        return koenigModule;
    }
    koenigPromise ??= fetchKoenigLexical().then((module) => {
        koenigModule = module;
    });
    // suspend until the module is loaded
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw koenigPromise;
}

class KoenigErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error(error);
    }

    render() {
        if (this.state.hasError) {
            return <p className="m-8 text-red-600">Loading the editor has failed. Try refreshing the browser!</p>;
        }
        return this.props.children;
    }
}

function KoenigEditorInner({ initialEditorState, placeholderText, onChange, registerAPI }: EditorKoenigProps) {
    const koenig = readKoenig();
    const KoenigComposer = koenig.KoenigComposer;
    const KoenigEditor = koenig.KoenigEditor;

    const { data: siteData } = useBrowseSite();
    const { data: settingsData } = useBrowseSettings();
    const { refetch: fetchLabelsQuery } = useBrowseLabels({
        searchParams: { limit: "all", fields: "id,name" },
        enabled: false,
    });
    const fetchEmbed = useKoenigFetchEmbed();

    const settings = settingsData?.settings;
    // Ember's config.blogUrl: the site endpoint's url without a trailing slash
    const siteUrl = siteData?.site?.url?.replace(/\/+$/, "") ?? window.location.origin;
    const siteTitle = settings ? getSettingValue<string>(settings, "title") ?? "" : "";
    const siteDescription = settings ? getSettingValue<string>(settings, "description") ?? "" : "";
    const membersSignupAccess = settings ? getSettingValue<string>(settings, "members_signup_access") ?? "all" : "all";
    const donationsEnabled = settings ? getSettingValue<boolean>(settings, "donations_enabled") ?? false : false;
    const recommendationsEnabled = settings ? getSettingValue<boolean>(settings, "recommendations_enabled") ?? false : false;

    const { fetchAutocompleteLinks, searchLinks } = useKoenigLinkSuggestions({
        siteUrl,
        membersSignupAccess,
        donationsEnabled,
        recommendationsEnabled,
    });

    const cardConfig = useMemo(() => ({
        fetchEmbed,
        fetchLabels: async () => {
            const { data } = await fetchLabelsQuery();
            return (data?.labels ?? []).map(label => label.name);
        },
        fetchAutocompleteLinks,
        searchLinks,
        membersEnabled: membersSignupAccess === "all",
        siteTitle,
        siteDescription,
        siteUrl,
        // unsplash/tenor/pintura/snippets are wired in a follow-up slice
    }), [fetchEmbed, fetchLabelsQuery, fetchAutocompleteLinks, searchLinks, membersSignupAccess, siteTitle, siteDescription, siteUrl]);

    const handleChange = (editorState: unknown) => {
        onChange(JSON.stringify(editorState));
    };

    return (
        <KoenigComposer
            cardConfig={cardConfig}
            darkMode={false}
            fileUploader={{ useFileUpload: useKoenigFileUpload, fileTypes: koenigFileUploadTypes }}
            initialEditorState={initialEditorState ?? undefined}
            isTKEnabled={false}
            onError={(error: unknown) => console.error(error)}
        >
            <KoenigEditor
                darkMode={false}
                placeholderText={placeholderText}
                registerAPI={registerAPI}
                onChange={handleChange}
            />
        </KoenigComposer>
    );
}

export function EditorKoenig(props: EditorKoenigProps) {
    return (
        <div className="koenig-react-editor koenig-lexical">
            <KoenigErrorBoundary>
                <Suspense fallback={<p className="koenig-react-editor-loading">Loading editor...</p>}>
                    <KoenigEditorInner {...props} />
                </Suspense>
            </KoenigErrorBoundary>
        </div>
    );
}
