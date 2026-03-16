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

export interface CardConfig {
    createSnippet?: (snippet: Snippet) => void;
    deleteSnippet?: (snippet: {name: string}) => void;
    fetchEmbed?: (url: string, options: FetchEmbedOptions) => Promise<EmbedResponse>;
    fetchLabels?: () => Promise<string[]>;
    fetchAutocompleteLinks?: () => Promise<{value: string; label: string}[]>;
    searchLinks?: (term?: string) => Promise<unknown>;
    siteUrl?: string;
    klipy?: {apiKey: string; contentFilter?: string} | null;
    unsplash?: unknown;
    pinturaConfig?: PinturaConfig;
    renderLabels?: boolean;
    image?: {allowedWidths?: string[]};
    feature?: Record<string, unknown>;
    snippets?: Snippet[];
    [key: string]: unknown;
}

export interface KoenigComposerContextType {
    fileUploader: FileUploader;
    editorContainerRef: React.RefObject<HTMLElement | null>;
    cardConfig: CardConfig;
    darkMode: boolean;
    enableMultiplayer: boolean;
    isTKEnabled?: boolean;
    multiplayerEndpoint?: string;
    multiplayerDocId?: string;
    multiplayerUsername?: string;
    createWebsocketProvider: (id: string, yjsDocMap: Map<string, Doc>) => unknown;
    onWordCountChangeRef: React.RefObject<((counts: unknown) => void) | null>;
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

const KoenigComposerContext = React.createContext<KoenigComposerContextType>({
    fileUploader: defaultFileUploader,
    editorContainerRef: React.createRef<HTMLElement>(),
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider() {
        throw new Error('KoenigComposerContext createWebsocketProvider was called outside KoenigComposer');
    },
    onWordCountChangeRef: React.createRef<((counts: unknown) => void) | null>()
});

export default KoenigComposerContext;
