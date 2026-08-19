import React from 'react';
import type {Doc} from 'yjs';

export interface FileTypeConfig {
    mimeTypes: string[];
    extensions?: string[];
    [key: string]: unknown;
}

export interface FileUploadResultItem {
    url: string;
    fileName?: string;
    [key: string]: unknown;
}

export interface FileUploadResult {
    isLoading: boolean;
    upload: (files: File[] | FileList, options?: Record<string, unknown>) => Promise<FileUploadResultItem[] | null>;
    progress: number;
    errors: {message: string}[];
    filesNumber: number;
    [key: string]: unknown;
}

export interface FileUploader {
    useFileUpload: (type: string) => FileUploadResult;
    fileTypes: Record<string, FileTypeConfig>;
    [key: string]: unknown;
}

export interface PinturaConfig {
    jsUrl?: string;
    cssUrl?: string;
}

export interface EmbedResponse {
    url?: string;
    title?: string;
    description?: string;
    icon?: string;
    thumbnail?: string;
    author?: string;
    publisher?: string;
    type?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface Snippet {
    name: string;
    value: string;
}

export interface FetchEmbedOptions {
    type?: string;
    [key: string]: unknown;
}

export type PostVisibility = 'public' | 'members' | 'paid' | 'tiers';

// `visibility` is required: the host resolves it against the site default
// before handing the config over, so cards never have to guess at access
export interface CardConfigPost {
    displayName?: 'post' | 'page';
    isPage?: boolean;
    showTitleAndFeatureImage?: boolean;
    visibility: PostVisibility;
    // tier slugs, only meaningful when `visibility` is 'tiers'
    tiers?: string[];
}

// no index signature: a new flag must be declared here before a card can read it
export interface CardConfigFeature {
    transistor?: boolean;
    paywallImprovements?: boolean;
    paywallV2?: boolean;
}

export interface CardConfig {
    createSnippet?: (snippet: Snippet) => void;
    deleteSnippet?: (snippet: {name: string}) => void;
    fetchEmbed?: (url: string, options: FetchEmbedOptions) => Promise<EmbedResponse>;
    fetchLabels?: () => Promise<string[]>;
    fetchAutocompleteLinks?: () => Promise<{value: string; label: string}[]>;
    // Gates the post. Only ever called for a paywall inserted into a public
    // post, where the author has asked for part of it to be gated without
    // having said who for.
    setPostVisibility?: (visibility: PostVisibility) => void;
    // Set when a paywall card is being edited as a global default rather than
    // inside a post: it fixes which of the card's two paywalls is on screen, and
    // takes away the chrome that only means something in a post.
    paywallDefaults?: {target: 'web' | 'email'};
    // A paywall was inserted into a public post, so the post was gated to match.
    // The author asked for the paywall, not for the access change that had to
    // come with it, so the host says which one it picked.
    onPostGated?: (visibility: PostVisibility) => void;
    // The post went public, so its paywall was taken out from under the author.
    // They can't be expected to notice content disappearing from a card that
    // may be well down the post, so the host says so.
    onPaywallRemoved?: () => void;
    searchLinks?: (term?: string) => Promise<unknown>;
    siteUrl?: string;
    klipy?: {apiKey: string; contentFilter?: string} | null;
    unsplash?: unknown;
    pinturaConfig?: PinturaConfig | null;
    renderLabels?: boolean;
    image?: {allowedWidths?: string[]};
    feature?: CardConfigFeature;
    post?: CardConfigPost;
    snippets?: Snippet[];
    [key: string]: unknown;
}

export interface KoenigComposerContextType {
    fileUploader: FileUploader;
    // mutable: KoenigComposableEditor and WordCountPlugin assign to `.current`
    editorContainerRef: React.MutableRefObject<HTMLElement | null>;
    cardConfig: CardConfig;
    darkMode: boolean;
    enableMultiplayer: boolean;
    isTKEnabled?: boolean;
    multiplayerEndpoint?: string;
    multiplayerDocId?: string;
    multiplayerUsername?: string;
    createWebsocketProvider: (id: string, yjsDocMap: Map<string, Doc>) => unknown;
    onWordCountChangeRef: React.MutableRefObject<((counts: unknown) => void) | null>;
    onError?: (error: Error) => void;
    dragDropHandler?: unknown;
    [key: string]: unknown;
}

export const defaultFileUploader: FileUploader = {
    fileTypes: {},
    useFileUpload() {
        console.error('<KoenigComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook');
        return {
            isLoading: false,
            async upload() {
                return null;
            },
            progress: 0,
            errors: [],
            filesNumber: 0
        };
    }
};

// exported so stories and tests can render cards against a partial context,
// e.g. value={{...defaultKoenigComposerContext, cardConfig}}
export const defaultKoenigComposerContext: KoenigComposerContextType = {
    fileUploader: defaultFileUploader,
    editorContainerRef: {current: null},
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider() {
        throw new Error('KoenigComposerContext createWebsocketProvider was called outside KoenigComposer');
    },
    onWordCountChangeRef: {current: null}
};

const KoenigComposerContext = React.createContext<KoenigComposerContextType>(defaultKoenigComposerContext);

export default KoenigComposerContext;
