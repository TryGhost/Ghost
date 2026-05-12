import {useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode} from "react";
import {useLocation, useNavigate, useParams} from "@tryghost/admin-x-framework";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, InputGroup, InputGroupAddon, InputGroupInput, LoadingIndicator, Separator, Table, TableBody, TableCell, TableRow, Textarea} from "@tryghost/shade/components";
import {usePinturaConfig} from "@tryghost/admin-x-framework/hooks";
import {Filters} from "@tryghost/shade/patterns";
import type {Filter, FilterFieldConfig} from "@tryghost/shade/patterns";
import {ListHeader} from "@tryghost/shade/primitives";
import LabelPicker from "@tryghost/posts/label-picker";
import {cn, formatNumber, LucideIcon} from "@tryghost/shade/utils";
import {useAddMediaFolder, useBrowseMedia, useBrowseMediaFolders, useDeleteMediaFile, useEditMedia, useReadMedia, useReplaceMediaFile, useUploadMediaFile} from "@tryghost/admin-x-framework/api/media";
import type {MediaFile, MediaFolder, MediaSource, MediaType} from "@tryghost/admin-x-framework/api/media";
import type {Label} from "@tryghost/admin-x-framework/api/labels";

type ViewMode = "grid" | "list";
type FileTypeFilterValue = MediaType | "pdf" | "other";
const MEDIA_LIBRARY_VIEW_STORAGE_KEY = "ghost-admin:media-library:view";
const MEDIA_CONTROLS_MOBILE_BREAKPOINT = 1024;

const isMobileMediaControlsLayout = () => {
    if (typeof window === "undefined") {
        return false;
    }

    return window.innerWidth < MEDIA_CONTROLS_MOBILE_BREAKPOINT;
};

const useMobileMediaControlsLayout = () => {
    const [isMobileControlsLayout, setIsMobileControlsLayout] = useState(isMobileMediaControlsLayout);

    useEffect(() => {
        const onResize = () => setIsMobileControlsLayout(isMobileMediaControlsLayout());

        onResize();
        window.addEventListener("resize", onResize);

        return () => window.removeEventListener("resize", onResize);
    }, []);

    return isMobileControlsLayout;
};

const getStoredViewMode = (): ViewMode => {
    if (typeof window === "undefined") {
        return "grid";
    }

    try {
        const storedView = window.localStorage.getItem(MEDIA_LIBRARY_VIEW_STORAGE_KEY);

        return storedView === "list" || storedView === "grid" ? storedView : "grid";
    } catch {
        return "grid";
    }
};

type MediaMetadataUpdate = Pick<MediaFile, "name" | "caption"> & Partial<Pick<MediaFile, "alt_text">>;
type MediaMetadataForm = {
    name: string;
    alt_text: string;
    caption: string;
};
type FrameOptionType = "solidSharp" | "solidRound" | "lineSingle" | "hook" | "polaroid" | undefined;
type PinturaLocale = {
    labelNone: string;
    frameLabelMatSharp: string;
    frameLabelMatRound: string;
    frameLabelLineSingle: string;
    frameLabelCornerHooks: string;
    frameLabelPolaroid: string;
};
type PinturaProcessResult = {
    dest?: File;
    imageState?: unknown;
};
type PinturaEditor = {
    close?: () => void;
    imageState?: unknown;
    on: (event: string, callback: (result: unknown) => void) => void;
    destroy?: () => void;
};
type PinturaWindow = Window & typeof globalThis & {
    pintura?: {
        openDefaultEditor?: (params: {
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
            willClose: () => boolean;
        }) => PinturaEditor;
    };
};

const numberFormatter = formatNumber as (value: number) => string;

const stringifyPinturaImageState = (imageState: unknown) => {
    if (typeof imageState === "undefined" || imageState === null) {
        return null;
    }

    try {
        return JSON.stringify(imageState);
    } catch {
        return null;
    }
};

const pinturaEditorOptions = (src: string, willClose: () => boolean) => ({
    src,
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
        "resize"
    ],
    frameOptions: [
        [undefined, locale => locale.labelNone],
        ["solidSharp", locale => locale.frameLabelMatSharp],
        ["solidRound", locale => locale.frameLabelMatRound],
        ["lineSingle", locale => locale.frameLabelLineSingle],
        ["hook", locale => locale.frameLabelCornerHooks],
        ["polaroid", locale => locale.frameLabelPolaroid]
    ] as [FrameOptionType, (locale: PinturaLocale) => string][],
    cropSelectPresetFilter: "landscape",
    cropSelectPresetOptions: [
        [undefined, "Custom"],
        [1, "Square"],
        [2 / 1, "2:1"],
        [3 / 2, "3:2"],
        [4 / 3, "4:3"],
        [16 / 10, "16:10"],
        [16 / 9, "16:9"],
        [1 / 2, "1:2"],
        [2 / 3, "2:3"],
        [3 / 4, "3:4"],
        [10 / 16, "10:16"],
        [9 / 16, "9:16"]
    ] as [number | undefined, string][],
    locale: {
        labelButtonExport: "Save and close"
    },
    willClose
});

const fileTypeOptions: Array<{label: string; value: "all" | FileTypeFilterValue}> = [
    {label: "All files", value: "all"},
    {label: "Images", value: "image"},
    {label: "Videos", value: "video"},
    {label: "Audio", value: "audio"},
    {label: "PDF", value: "pdf"},
    {label: "Other files", value: "other"}
];

const sourceOptions: Array<{label: string; value: "all" | MediaSource}> = [
    {label: "All sources", value: "all"},
    {label: "Uploads", value: "upload"},
    {label: "Unsplash", value: "unsplash"},
    {label: "Tenor GIF", value: "tenor"},
    {label: "External", value: "external"}
];

const sortOptions = [
    {label: "Newest", value: "created_at desc"},
    {label: "Oldest", value: "created_at asc"},
    {label: "Name", value: "name asc"}
];

const filterToApiParam = (filter: Filter<string>) => {
    const value = filter.values[0];

    if (!value) {
        return null;
    }

    if (filter.field === "file_type") {
        switch (value) {
        case "image":
        case "video":
        case "audio":
            return `media_type:${value}`;
        case "pdf":
            return "media_type:file+extension:pdf";
        case "other":
            return "media_type:file+extension:-pdf";
        default:
            return null;
        }
    }

    return `${filter.field}:${value}`;
};

const formatBytes = (bytes: number | null) => {
    if (bytes === null) {
        return null;
    }

    if (bytes < 1024) {
        return `${numberFormatter(bytes)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${numberFormatter(Math.round(bytes / 1024))} KB`;
    }

    return `${numberFormatter(Math.round(bytes / 1024 / 1024))} MB`;
};

const formatDimensions = (media: MediaFile) => (
    media.width && media.height ? `${numberFormatter(media.width)} x ${numberFormatter(media.height)}` : null
);

const formatMediaSize = (media: MediaFile) => {
    const size = formatBytes(media.size_bytes);
    const dimensions = formatDimensions(media);

    if (size && dimensions) {
        return `${size} (${dimensions})`;
    }

    return size || dimensions;
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
}).format(new Date(value));

const displayNameWithoutExtension = (name: string, extension?: string | null) => {
    const trimmedName = name.trim();
    const extensionSuffix = extension ? `.${extension.toLowerCase()}` : "";

    if (extensionSuffix && trimmedName.toLowerCase().endsWith(extensionSuffix)) {
        return trimmedName.slice(0, -extensionSuffix.length);
    }

    return trimmedName;
};

const titleForMedia = (media: MediaFile) => {
    const name = media.name || media.url.split("/").pop() || "";
    return displayNameWithoutExtension(name, media.extension) || "Untitled file";
};

const isPdfMedia = (media: MediaFile) => (
    media.extension?.toLowerCase() === "pdf" || media.mime_type === "application/pdf"
);

const previewUrlForMedia = (media: MediaFile, url: string) => {
    if (!media.updated_at) {
        return url;
    }

    try {
        const previewUrl = new URL(url, window.location.href);
        previewUrl.searchParams.set("v", media.updated_at);
        return previewUrl.toString();
    } catch {
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}v=${encodeURIComponent(media.updated_at)}`;
    }
};

const sourceForMedia = (media: MediaFile) => {
    if (media.source === "unsplash") {
        return "Unsplash";
    }

    if (media.source === "tenor") {
        return "Tenor GIF";
    }

    try {
        const hostname = new URL(media.url).hostname;

        if (hostname === "unsplash.com" || hostname.endsWith(".unsplash.com")) {
            return "Unsplash";
        }

        if (hostname === "tenor.com" || hostname.endsWith(".tenor.com") || hostname === "tenor.googleapis.com") {
            return "Tenor GIF";
        }
    } catch {
        // Fall back to the indexed source below when the URL is not absolute.
    }

    if (media.source === "external") {
        return media.storage_path ? "Upload" : "External";
    }

    return "Upload";
};

const iconForType = (type: MediaType) => {
    switch (type) {
    case "image":
        return LucideIcon.Image;
    case "video":
        return LucideIcon.Video;
    case "audio":
        return LucideIcon.AudioLines;
    default:
        return LucideIcon.File;
    }
};

function usePinturaRuntime() {
    const pinturaConfig = usePinturaConfig();
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [cssLoaded, setCssLoaded] = useState(false);

    useEffect(() => {
        if (!pinturaConfig?.jsUrl) {
            setScriptLoaded(false);
            return;
        }

        if (typeof (window as PinturaWindow).pintura?.openDefaultEditor === "function") {
            setScriptLoaded(true);
            return;
        }

        let cancelled = false;

        try {
            import(/* @vite-ignore */ pinturaConfig.jsUrl)
                .then(() => {
                    if (!cancelled) {
                        setScriptLoaded(true);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setScriptLoaded(false);
                    }
                });
        } catch {
            setScriptLoaded(false);
        }

        return () => {
            cancelled = true;
        };
    }, [pinturaConfig?.jsUrl]);

    useEffect(() => {
        if (!pinturaConfig?.cssUrl) {
            setCssLoaded(false);
            return;
        }

        const existingLink = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
            .find(link => link.href === pinturaConfig.cssUrl);
        if (existingLink) {
            setCssLoaded(true);
            return;
        }

        let cancelled = false;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = pinturaConfig.cssUrl;
        link.onload = () => {
            if (!cancelled) {
                setCssLoaded(true);
            }
        };
        link.onerror = () => {
            if (!cancelled) {
                setCssLoaded(false);
            }
        };
        document.head.appendChild(link);

        return () => {
            cancelled = true;
        };
    }, [pinturaConfig?.cssUrl]);

    return !!pinturaConfig && scriptLoaded && cssLoaded && !!(window as PinturaWindow).pintura?.openDefaultEditor;
}

function MediaPreview({media, className = "", playable = false}: {media: MediaFile; className?: string; playable?: boolean}) {
    const Icon = iconForType(media.media_type);
    const imageUrl = previewUrlForMedia(media, media.thumbnail_url || media.url);
    const videoUrl = previewUrlForMedia(media, playable || media.url.includes("#") ? media.url : `${media.url}#t=0.001`);
    const intrinsicSize = media.width && media.height ? {
        width: media.width,
        height: media.height
    } : undefined;

    if (media.media_type === "image") {
        return (
            <div className={`flex items-center justify-center overflow-hidden bg-sidebar ${className}`}>
                <img
                    alt=""
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    src={imageUrl}
                    style={intrinsicSize}
                />
            </div>
        );
    }

    if (media.media_type === "video") {
        return (
            <div className={`relative flex items-center justify-center overflow-hidden bg-sidebar ${className}`}>
                <video
                    aria-hidden={!playable}
                    aria-label={playable ? `Play ${titleForMedia(media)}` : undefined}
                    autoPlay={playable}
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    controls={playable}
                    muted
                    playsInline
                    poster={media.thumbnail_url || undefined}
                    preload="metadata"
                    src={videoUrl}
                />
                {!playable && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/5 text-white">
                        <span className="flex size-10 items-center justify-center rounded-full bg-black/55">
                            <LucideIcon.Play className="ml-0.5 size-5 fill-current stroke-[1.75px]" />
                        </span>
                    </div>
                )}
            </div>
        );
    }

    if (playable && media.media_type === "file" && isPdfMedia(media)) {
        return (
            <div className={`flex items-center justify-center overflow-hidden bg-sidebar ${className}`}>
                <iframe
                    className="size-full border-0 bg-white"
                    src={previewUrlForMedia(media, media.url)}
                    title={`PDF preview: ${titleForMedia(media)}`}
                />
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center bg-sidebar text-gray-500 ${className}`}>
            <Icon className="size-9 stroke-[1.5px]" />
        </div>
    );
}

function MetadataRow({label, value}: {label: string; value: ReactNode}) {
    if (!value) {
        return null;
    }

    return (
        <div className="space-y-1 text-sm">
            <div className="font-medium text-gray-500">{label}</div>
            <div className="min-w-0 break-words text-gray-900">{value}</div>
        </div>
    );
}

function UrlMetadataRow({copied, url, onCopy}: {copied: boolean; url: string; onCopy: () => void}) {
    return (
        <div className="space-y-1 text-sm">
            <div className="font-medium text-gray-500">URL</div>
            <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1 break-words text-gray-900">{url}</div>
                <Button className="h-7 shrink-0 px-2 text-xs" type="button" variant="outline" onClick={onCopy}>
                    <LucideIcon.Copy className="mr-1 size-3.5" />
                    {copied ? "Copied" : "Copy"}
                </Button>
            </div>
        </div>
    );
}

function usageResourceTypeLabel(type: string) {
    return type === "page" ? "Page" : "Post";
}

function visibleUsagesForMedia(media: MediaFile) {
    const seenResources = new Set<string>();

    return (media.usages || []).filter((usage) => {
        if (!usage.resource) {
            return true;
        }

        const resourceKey = `${usage.resource.type}:${usage.resource.id}`;
        if (seenResources.has(resourceKey)) {
            return false;
        }

        seenResources.add(resourceKey);
        return true;
    });
}

function FolderPicker({folders, media, onCreate, onRemove, onSelect}: {
    folders: MediaFolder[];
    media: MediaFile;
    onCreate: (media: MediaFile, name: string) => Promise<void>;
    onRemove: (media: MediaFile) => Promise<void>;
    onSelect: (media: MediaFile, folder: MediaFolder) => Promise<void>;
}) {
    const selectedFolder = folders.find(folder => folder.id === media.folder_id);
    const labels = folders.map<Label>(folder => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        created_at: folder.created_at,
        updated_at: folder.updated_at || folder.created_at
    }));
    const selectedSlugs = selectedFolder ? [selectedFolder.slug] : [];
    const optionSource = {
        options: labels.map(label => ({
            label: label.name,
            value: label.slug,
            metadata: {
                id: label.id
            }
        })),
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: () => {},
        shouldClientFilter: true
    };
    const isDuplicateFolderName = (name: string) => {
        const normalizedName = name.trim().toLowerCase();

        return folders.some(folder => folder.name.toLowerCase() === normalizedName);
    };
    const canCreateFromSearch = (name: string) => !!name.trim() && !isDuplicateFolderName(name);

    return (
        <LabelPicker
            canCreateFromSearch={canCreateFromSearch}
            inputAriaLabel="Folder"
            labels={labels}
            optionSource={optionSource}
            placeholder="Add to folder"
            selectedSlugs={selectedSlugs}
            triggerClassName="!border-input !bg-white focus-within:!bg-white"
            onCreate={async (name) => {
                await onCreate(media, name);
                return undefined;
            }}
            onToggle={(slug) => {
                if (selectedFolder?.slug === slug) {
                    void onRemove(media);
                    return;
                }

                const folder = folders.find(item => item.slug === slug);

                if (folder) {
                    void onSelect(media, folder);
                }
            }}
        />
    );
}

function MediaCard({media, onSelect, selected, view}: {media: MediaFile; onSelect: (media: MediaFile) => void; selected: boolean; view: ViewMode}) {
    const meta = formatDimensions(media) || formatBytes(media.size_bytes) || media.mime_type;
    const commonClassName = selected ? "border-gray-300 bg-gray-50 ring-2 ring-gray-100" : "border-gray-200";

    if (view === "list") {
        const handleKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            event.preventDefault();
            onSelect(media);
        };

        return (
            <TableRow
                className="cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                data-state={selected ? "selected" : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(media)}
                onKeyDown={handleKeyDown}
            >
                <TableCell className="py-3 pr-4 pl-0">
                    <div className="flex min-w-0 items-center gap-5">
                        <MediaPreview className="h-16 w-[100px] shrink-0 rounded-md" media={media} />
                        <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-foreground">{titleForMedia(media)}</div>
                            <div className="mt-1 truncate text-sm text-muted-foreground">
                                {media.extension?.toUpperCase() || media.media_type}{meta ? ` · ${meta}` : ""}
                            </div>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="hidden w-40 py-3 pr-0 text-right text-sm whitespace-nowrap text-muted-foreground md:table-cell">
                    {formatDate(media.created_at)}
                </TableCell>
            </TableRow>
        );
    }

    return (
        <button
            className={`block w-full overflow-hidden rounded-lg border bg-white text-left transition hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:outline-hidden ${commonClassName}`}
            type="button"
            onClick={() => onSelect(media)}
        >
            <MediaPreview className="aspect-square w-full" media={media} />
            <div className="space-y-1 p-4">
                <div className="truncate text-sm font-semibold text-gray-900">{titleForMedia(media)}</div>
                <div className="truncate text-sm text-gray-600">{media.extension?.toUpperCase() || media.media_type}{meta ? ` · ${meta}` : ""}</div>
                <div className="text-xs text-gray-500">{formatDate(media.created_at)}</div>
            </div>
        </button>
    );
}

function MediaDetails({deleteSaving, folders, imageEditing, imageEditingSaving, media, metadataSaving, usageLoading, onClose, onDelete, onEditClose, onEditStart, onFolderChange, onFolderCreate, onImageEdit, onMetadataSave}: {
    deleteSaving: boolean;
    folders: MediaFolder[];
    imageEditing: boolean;
    imageEditingSaving: boolean;
    media: MediaFile | null;
    metadataSaving: boolean;
    usageLoading: boolean;
    onClose: () => void;
    onDelete: (media: MediaFile) => Promise<void>;
    onEditClose: () => void;
    onEditStart: (media: MediaFile) => void;
    onFolderChange: (media: MediaFile, folderId: string | null) => Promise<void>;
    onFolderCreate: (media: MediaFile, name: string) => Promise<void>;
    onImageEdit: (media: MediaFile, file: File) => Promise<void>;
    onMetadataSave: (media: MediaFile, metadata: MediaMetadataUpdate) => Promise<void>;
}) {
    const navigate = useNavigate();
    const pinturaEnabled = usePinturaRuntime();
    const allowPinturaClose = useRef(false);
    const preventPinturaReopen = useRef(false);
    const editRouteCloseRequested = useRef(false);
    const suppressPinturaHideRouteClose = useRef(false);
    const pinturaEditorRef = useRef<PinturaEditor | null>(null);
    const [copied, setCopied] = useState(false);
    const [pinturaActive, setPinturaActive] = useState(false);
    const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [metadata, setMetadata] = useState<MediaMetadataForm>({
        name: "",
        alt_text: "",
        caption: ""
    });

    useEffect(() => {
        setCopied(false);
        setDeleteBlockedOpen(false);
        setDeleteConfirmOpen(false);
        setMetadata({
            name: media ? titleForMedia(media) : "",
            alt_text: media?.alt_text || "",
            caption: media?.caption || ""
        });
    }, [media]);

    const trimmedName = displayNameWithoutExtension(metadata.name, media?.extension);
    const showAltText = media?.media_type === "image";
    const normalizedMetadata: MediaMetadataUpdate = {
        name: trimmedName,
        caption: metadata.caption.trim() || null,
        ...(showAltText ? {alt_text: metadata.alt_text.trim() || null} : {})
    };
    const metadataCanSave = !!media && !!trimmedName && !metadataSaving;
    const canEditImage = media?.media_type === "image" && pinturaEnabled;
    const visibleUsages = media ? visibleUsagesForMedia(media) : [];
    const hasTrackedUsage = !!media?.usages?.length;

    const copyUrl = async () => {
        if (!media) {
            return;
        }

        await navigator.clipboard.writeText(media.url);
        setCopied(true);
    };

    const saveMetadata = async () => {
        if (!media || !metadataCanSave) {
            return;
        }

        await onMetadataSave(media, normalizedMetadata);
        onClose();
    };

    const saveEditedImage = useCallback(async (file: File) => {
        if (!media) {
            return;
        }

        await onImageEdit(media, file);
        if (!editRouteCloseRequested.current) {
            editRouteCloseRequested.current = true;
            onEditClose();
        }
    }, [media, onEditClose, onImageEdit]);

    const requestEditorRouteClose = useCallback(() => {
        preventPinturaReopen.current = true;

        if (!editRouteCloseRequested.current) {
            editRouteCloseRequested.current = true;
            onEditClose();
        }
    }, [onEditClose]);

    const closePinturaInstance = useCallback(() => {
        const editor = pinturaEditorRef.current;

        if (!editor) {
            setPinturaActive(false);
            return;
        }

        suppressPinturaHideRouteClose.current = true;
        allowPinturaClose.current = true;
        editor.close?.();
        editor.destroy?.();
        pinturaEditorRef.current = null;
        setPinturaActive(false);
    }, []);

    const onDeleteClick = () => {
        if (hasTrackedUsage) {
            setDeleteBlockedOpen(true);
            return;
        }

        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!media || hasTrackedUsage) {
            return;
        }

        await onDelete(media);
        setDeleteConfirmOpen(false);
    };

    const openPinturaEditor = useCallback(() => {
        const pintura = (window as PinturaWindow).pintura;

        if (!media || !pintura?.openDefaultEditor || !pinturaEnabled || pinturaEditorRef.current) {
            return;
        }

        preventPinturaReopen.current = false;
        editRouteCloseRequested.current = false;
        const imageUrl = new URL(media.url, window.location.href);
        if (!imageUrl.searchParams.has("v")) {
            imageUrl.searchParams.set("v", Date.now().toString());
        }

        allowPinturaClose.current = false;
        setPinturaActive(true);

        const editor = pintura.openDefaultEditor(pinturaEditorOptions(imageUrl.href, () => {
            if (allowPinturaClose.current) {
                allowPinturaClose.current = false;
                return true;
            }

            return false;
        }));
        pinturaEditorRef.current = editor;
        let savingEditedImage = false;
        let initialImageState: string | null = null;
        let initialImageStateCaptured = false;
        let latestImageState: string | null = null;
        let imageStateUpdated = false;
        let imageStateChanged = false;

        editor.on("load", () => {
            initialImageState = stringifyPinturaImageState(editor.imageState);
            latestImageState = initialImageState;
            initialImageStateCaptured = true;
        });

        editor.on("update", (imageState) => {
            const nextImageState = stringifyPinturaImageState(imageState);

            if (!initialImageStateCaptured) {
                initialImageState = nextImageState;
                initialImageStateCaptured = true;
            }

            latestImageState = nextImageState;
            imageStateUpdated = true;
            imageStateChanged = initialImageState !== latestImageState;
        });

        editor.on("loaderror", () => {
            pinturaEditorRef.current = null;
            setPinturaActive(false);
            requestEditorRouteClose();
        });

        editor.on("hide", () => {
            pinturaEditorRef.current = null;
            setPinturaActive(false);

            if (suppressPinturaHideRouteClose.current) {
                suppressPinturaHideRouteClose.current = false;
                return;
            }

            if (!savingEditedImage) {
                requestEditorRouteClose();
            }
        });

        editor.on("process", (result) => {
            const processResult = result as PinturaProcessResult;
            const processedImageState = stringifyPinturaImageState(processResult.imageState) || latestImageState;
            const hasChanges = imageStateUpdated && (
                imageStateChanged
                || (initialImageStateCaptured && processedImageState !== initialImageState)
            );

            if (!hasChanges || !processResult.dest) {
                preventPinturaReopen.current = true;
                allowPinturaClose.current = true;
                editor.close?.();
                return;
            }

            preventPinturaReopen.current = true;
            savingEditedImage = true;
            allowPinturaClose.current = true;
            void saveEditedImage(processResult.dest);
        });
    }, [media, pinturaEnabled, requestEditorRouteClose, saveEditedImage]);

    useLayoutEffect(() => {
        if (imageEditing) {
            if (!preventPinturaReopen.current) {
                openPinturaEditor();
            }
            return;
        }

        preventPinturaReopen.current = false;
        editRouteCloseRequested.current = false;
        closePinturaInstance();
    }, [closePinturaInstance, imageEditing, openPinturaEditor]);

    useEffect(() => {
        return () => {
            closePinturaInstance();
        };
    }, [closePinturaInstance]);

    useEffect(() => {
        if (!pinturaActive) {
            return;
        }

        const handleCloseClick = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('.PinturaModal button[title="Close"]')) {
                allowPinturaClose.current = true;
            }
        };

        const handleEscapePress = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
            }
        };

        window.addEventListener("click", handleCloseClick, {capture: true});
        window.addEventListener("keydown", handleEscapePress, {capture: true});

        return () => {
            window.removeEventListener("click", handleCloseClick, {capture: true});
            window.removeEventListener("keydown", handleEscapePress, {capture: true});
        };
    }, [pinturaActive]);

    return (
        <Dialog modal={false} open={!!media} onOpenChange={(open) => {
            if (!open && !pinturaActive) {
                onClose();
            }
        }}>
            <DialogContent
                className="top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 grid-rows-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none sm:rounded-none"
                onEscapeKeyDown={(event) => {
                    if (pinturaActive) {
                        event.preventDefault();
                        return;
                    }

                    event.preventDefault();
                    onClose();
                }}
                onInteractOutside={(event) => {
                    if (pinturaActive) {
                        event.preventDefault();
                    }
                }}
            >
                {media && (
                    <>
                        <div className="grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-4 border-b px-4">
                            <div className="flex justify-start">
                                <DialogClose asChild>
                                    <Button aria-label="Close media details" className="size-9 p-0" type="button" variant="outline">
                                        <LucideIcon.ArrowLeft className="size-4" />
                                    </Button>
                                </DialogClose>
                            </div>

                            <div className="min-w-0 text-center">
                                <DialogTitle className="truncate text-base">{titleForMedia(media)}</DialogTitle>
                                <DialogDescription className="sr-only">Media file details and usage.</DialogDescription>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <Button className="w-[96px]" disabled={!media || !trimmedName || metadataSaving} type="button" onClick={() => {
                                    void saveMetadata();
                                }}>
                                    <span className="inline-flex items-center justify-center gap-2">
                                        {metadataSaving && <LoadingIndicator color="light" size="sm" />}
                                        {metadataSaving ? "Saving" : "Done"}
                                    </span>
                                </Button>
                            </div>
                        </div>

                        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
                            <div className="flex min-h-0 items-center justify-center bg-gray-50 p-8">
                                <MediaPreview className="size-full rounded-md" media={media} playable />
                            </div>

                            <aside className="min-h-0 overflow-y-auto border-l bg-background p-8">
                                <div className="space-y-6">
                                    {canEditImage && (
                                        <button
                                            className="flex w-full items-center gap-4 rounded-md border border-gray-200 p-3 text-left transition hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
                                            disabled={imageEditing || imageEditingSaving}
                                            type="button"
                                            onClick={() => onEditStart(media)}
                                        >
                                            <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-sidebar text-gray-900">
                                                <LucideIcon.Crop className="size-5 stroke-[1.75px]" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-gray-900">Edit image</span>
                                                <span className="block text-sm text-gray-600">Crop, resize and adjust</span>
                                            </span>
                                        </button>
                                    )}

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900">Metadata</h3>
                                        <div className="space-y-4">
                                            <label className="block space-y-1 text-sm">
                                                <span className="font-medium text-gray-500">Display name</span>
                                                <Input
                                                    aria-label="Display name"
                                                    value={metadata.name}
                                                    onChange={event => setMetadata(current => ({...current, name: event.target.value}))}
                                                />
                                            </label>
                                            <div className="block space-y-1 text-sm">
                                                <span className="font-medium text-gray-500">Folder</span>
                                                <FolderPicker
                                                    folders={folders}
                                                    media={media}
                                                    onCreate={onFolderCreate}
                                                    onRemove={(item) => onFolderChange(item, null)}
                                                    onSelect={(item, folder) => onFolderChange(item, folder.id)}
                                                />
                                            </div>
                                            {showAltText && (
                                                <label className="block space-y-1 text-sm">
                                                    <span className="font-medium text-gray-500">Alt text</span>
                                                    <Textarea
                                                        aria-label="Alt text"
                                                        rows={3}
                                                        value={metadata.alt_text || ""}
                                                        onChange={event => setMetadata(current => ({...current, alt_text: event.target.value}))}
                                                    />
                                                </label>
                                            )}
                                            <label className="block space-y-1 text-sm">
                                                <span className="font-medium text-gray-500">Caption</span>
                                                <Textarea
                                                    aria-label="Caption"
                                                    rows={3}
                                                    value={metadata.caption || ""}
                                                    onChange={event => setMetadata(current => ({...current, caption: event.target.value}))}
                                                />
                                            </label>
                                        </div>
                                    </section>

                                    <Separator />

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900">Details</h3>
                                        <div className="space-y-3">
                                            <UrlMetadataRow copied={copied} url={media.url} onCopy={() => {
                                                void copyUrl();
                                            }} />
                                            <MetadataRow label="Type" value={media.mime_type || media.media_type} />
                                            <MetadataRow label="Size" value={formatMediaSize(media)} />
                                            <MetadataRow label="Source" value={sourceForMedia(media)} />
                                            <MetadataRow label="Added" value={formatDate(media.created_at)} />
                                        </div>
                                    </section>

                                    <Separator />

                                    <section className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900">Usage</h3>
                                        {usageLoading && !media.usages ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <LoadingIndicator color="dark" size="sm" />
                                                Loading usage
                                            </div>
                                        ) : visibleUsages.length ? (
                                            <div className="space-y-2">
                                                {visibleUsages.map(usage => (
                                                    usage.resource ? (
                                                        <button
                                                            className="block w-full rounded-md border border-gray-200 bg-white p-3 text-left text-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-1 focus-visible:outline-none"
                                                            key={usage.id}
                                                            type="button"
                                                            onClick={() => navigate(usage.resource?.editor_url || "", {crossApp: true})}
                                                        >
                                                            <div className="font-medium text-gray-900">{usage.resource.title}</div>
                                                            <div className="mt-1 text-gray-500">{usageResourceTypeLabel(usage.resource.type)}</div>
                                                        </button>
                                                    ) : (
                                                        <div className="rounded-md border border-gray-200 bg-white p-3 text-sm" key={usage.id}>
                                                            <div className="font-medium text-gray-900">{usageResourceTypeLabel(usage.resource_type)}</div>
                                                            <div className="mt-1 break-words text-gray-500">{usage.resource_id}</div>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-600">No tracked usage yet.</p>
                                        )}
                                    </section>

                                    <Separator />

                                    <section className="space-y-3">
                                        <Button
                                            className="h-auto justify-start px-0 text-destructive hover:bg-transparent hover:text-destructive"
                                            disabled={deleteSaving || (usageLoading && !media.usages)}
                                            type="button"
                                            variant="ghost"
                                            onClick={onDeleteClick}
                                        >
                                            <LucideIcon.Trash2 className="mr-2 size-4" />
                                            {deleteSaving ? "Deleting" : "Delete file"}
                                        </Button>
                                    </section>
                                </div>
                            </aside>
                        </div>

                        <AlertDialog open={deleteBlockedOpen} onOpenChange={setDeleteBlockedOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>File is in use</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This file cannot be deleted while it has tracked usage. Remove it from the post or page where it is used, then try again.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogAction asChild>
                                        <Button type="button">OK</Button>
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This removes the file from the media library and Ghost storage. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel asChild>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </AlertDialogCancel>
                                    <AlertDialogAction asChild>
                                        <Button disabled={deleteSaving} type="button" variant="destructive" onClick={() => {
                                            void confirmDelete();
                                        }}>
                                            {deleteSaving ? "Deleting" : "Delete"}
                                        </Button>
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function MediaLibrary() {
    const [search, setSearch] = useState("");
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [mobileSearchOpenedByUser, setMobileSearchOpenedByUser] = useState(false);
    const isMobileControlsLayout = useMobileMediaControlsLayout();
    const deferredSearch = useDeferredValue(search.trim());
    const [filters, setFilters] = useState<Filter<string>[]>([]);
    const [order, setOrder] = useState("created_at desc");
    const [view, setView] = useState<ViewMode>(getStoredViewMode);
    const [page, setPage] = useState(1);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const {folderSlug: routeFolderSlug, mediaId: routeMediaId} = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [createdFolders, setCreatedFolders] = useState<MediaFolder[]>([]);
    const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
    const [isMobileFolderMenuOpen, setIsMobileFolderMenuOpen] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const upload = useUploadMediaFile();
    const deleteMediaFile = useDeleteMediaFile();
    const replaceMediaFile = useReplaceMediaFile();
    const addFolder = useAddMediaFolder();
    const editMedia = useEditMedia();
    const {data: foldersData} = useBrowseMediaFolders();
    const folders = useMemo(() => {
        const fetchedFolders = foldersData?.media_folders || [];
        const fetchedIds = new Set(fetchedFolders.map(folder => folder.id));

        return [
            ...fetchedFolders,
            ...createdFolders.filter(folder => !fetchedIds.has(folder.id))
        ];
    }, [createdFolders, foldersData?.media_folders]);
    const activeFolder = folders.find(folder => folder.slug === routeFolderSlug) || null;
    const activeFolderId = activeFolder?.id || null;
    const foldersLoaded = !!foldersData;
    const isResolvingRouteSegment = !!routeFolderSlug && !activeFolder && !foldersLoaded;
    const isInvalidFolder = !!routeMediaId && !!routeFolderSlug && !activeFolder && foldersLoaded;
    const routeMediaIdFromSingleSegment = !routeMediaId && routeFolderSlug && !activeFolder && foldersLoaded ? routeFolderSlug : "";
    const resolvedMediaId = routeMediaId || routeMediaIdFromSingleSegment;

    const navigateToFolder = useCallback((folder: MediaFolder | null, options?: {replace?: boolean}) => {
        navigate(folder ? `/media/${encodeURIComponent(folder.slug)}` : "/media", options);
    }, [navigate]);
    const mediaLibraryPath = activeFolder ? `/media/${encodeURIComponent(activeFolder.slug)}` : "/media";
    const mediaDetailsPath = useCallback((media: MediaFile) => activeFolder ? `${mediaLibraryPath}/${encodeURIComponent(media.id)}` : `/media/${encodeURIComponent(media.id)}`, [activeFolder, mediaLibraryPath]);
    const mediaEditorPath = useCallback((media: MediaFile) => `${mediaDetailsPath(media)}/edit`, [mediaDetailsPath]);
    const imageEditingRoute = /\/edit\/?$/.test(location.pathname);
    const closeMediaDetails = () => {
        setSelectedMedia(null);
        navigate(mediaLibraryPath);
    };
    const openMediaDetails = (media: MediaFile) => {
        setSelectedMedia(media);
        navigate(mediaDetailsPath(media));
    };

    useEffect(() => {
        setPage(1);
    }, [activeFolderId, deferredSearch, filters, order]);

    useEffect(() => {
        try {
            window.localStorage.setItem(MEDIA_LIBRARY_VIEW_STORAGE_KEY, view);
        } catch {
            // Ignore storage failures, for example in private browsing modes.
        }
    }, [view]);

    useEffect(() => {
        if (routeMediaId && routeFolderSlug && folders.length > 0 && !activeFolder) {
            navigateToFolder(null, {replace: true});
        }
    }, [activeFolder, folders, navigateToFolder, routeFolderSlug, routeMediaId]);

    const filterFields = useMemo<FilterFieldConfig<string>[]>(
        () => [
            {
                key: "file_type",
                label: "File type",
                type: "select",
                icon: <LucideIcon.File className="size-4" />,
                options: fileTypeOptions
                    .filter((option): option is {label: string; value: FileTypeFilterValue} => option.value !== "all")
                    .map(option => ({label: option.label, value: option.value})),
                operators: [{value: "is", label: "is"}],
                searchable: false,
                hideOperatorSelect: true
            },
            {
                key: "source",
                label: "Source",
                type: "select",
                icon: <LucideIcon.Upload className="size-4" />,
                options: sourceOptions
                    .filter((option): option is {label: string; value: MediaSource} => option.value !== "all")
                    .map(option => ({label: option.label, value: option.value})),
                operators: [{value: "is", label: "is"}],
                searchable: false,
                hideOperatorSelect: true
            }
        ],
        []
    );

    const searchParams = useMemo(() => {
        const filter = filters
            .map(filterToApiParam)
            .filter(Boolean)
            .concat(activeFolderId ? [`folder_id:${activeFolderId}`] : [])
            .join("+");

        return {
            limit: "30",
            page: page.toString(),
            order,
            ...(deferredSearch ? {search: deferredSearch} : {}),
            ...(filter ? {filter} : {})
        };
    }, [activeFolderId, deferredSearch, filters, order, page]);

    const {data, isFetching, isLoading, isError, refetch} = useBrowseMedia({
        searchParams,
        enabled: !isResolvingRouteSegment && !isInvalidFolder,
        refetchOnMount: "always"
    });
    const selectedMediaId = resolvedMediaId || selectedMedia?.id || "";
    const {data: selectedMediaData, isFetching: isFetchingSelectedMedia} = useReadMedia(selectedMediaId, {
        enabled: !!selectedMediaId
    });
    const selectedMediaDetails = useMemo(() => {
        const readMedia = selectedMediaData?.media?.[0];

        if (!selectedMediaId) {
            return null;
        }

        if (!readMedia) {
            return selectedMedia?.id === selectedMediaId ? selectedMedia : null;
        }

        if (selectedMedia?.id !== readMedia.id) {
            return readMedia;
        }

        return {
            ...readMedia,
            ...selectedMedia,
            usages: readMedia.usages
        };
    }, [selectedMedia, selectedMediaData?.media, selectedMediaId]);
    const closeMediaEditor = useCallback(() => {
        const mediaForRoute = selectedMediaDetails || selectedMedia;

        navigate(mediaForRoute ? mediaDetailsPath(mediaForRoute) : mediaLibraryPath, {replace: true});
    }, [mediaDetailsPath, mediaLibraryPath, navigate, selectedMedia, selectedMediaDetails]);
    const openMediaEditor = (media: MediaFile) => {
        navigate(mediaEditorPath(media));
    };

    useEffect(() => {
        if (imageEditingRoute && selectedMediaDetails && selectedMediaDetails.media_type !== "image") {
            closeMediaEditor();
        }
    }, [closeMediaEditor, imageEditingRoute, selectedMediaDetails]);

    const media = data?.media || [];
    const pagination = data?.meta?.pagination;
    const hasFilters = filters.length > 0;
    const shouldShowMobileSearchRow = showMobileSearch;
    const addFilterButtonClassName = "h-[34px] border-input bg-white dark:bg-background";
    const clearFiltersButton = hasFilters ? (
        <div className="flex shrink-0 items-center gap-4 sm:absolute sm:top-0 sm:right-0">
            <Button
                className="hidden items-center gap-1 !px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground lg:inline-flex"
                type="button"
                variant="ghost"
                onClick={() => setFilters([])}
            >
                <LucideIcon.X className="size-4" />
                Clear
            </Button>
        </div>
    ) : undefined;

    const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);

        for (const file of files) {
            await upload.mutateAsync({file, folderId: activeFolderId});
        }

        await refetch();
        event.target.value = "";
    };

    const createFolder = async (name: string) => {
        const response = await addFolder.mutateAsync({name});
        const folder = response.media_folders[0];
        setCreatedFolders(current => [...current.filter(item => item.id !== folder.id), folder]);

        return folder;
    };

    const onCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = newFolderName.trim();
        if (!name) {
            return;
        }

        const folder = await createFolder(name);
        setNewFolderName("");
        setIsCreatingFolder(false);
        navigateToFolder(folder);
        setIsFolderMenuOpen(false);
        setIsMobileFolderMenuOpen(false);
    };

    const selectFolder = (folder: MediaFolder | null) => {
        navigateToFolder(folder);
        setIsCreatingFolder(false);
        setNewFolderName("");
        setIsFolderMenuOpen(false);
        setIsMobileFolderMenuOpen(false);
    };

    const onFolderChange = async (media: MediaFile, folderId: string | null) => {
        const response = await editMedia.mutateAsync({
            id: media.id,
            folder_id: folderId
        });

        setSelectedMedia(response.media?.[0] || {...media, folder_id: folderId});
        await refetch();
    };

    const onFolderCreateForMedia = async (media: MediaFile, name: string) => {
        const folder = await createFolder(name);
        await onFolderChange(media, folder.id);
    };

    const onMetadataSave = async (media: MediaFile, metadata: MediaMetadataUpdate) => {
        const response = await editMedia.mutateAsync({
            id: media.id,
            ...metadata
        });
        setSelectedMedia(response.media?.[0] || {...media, ...metadata});
        await refetch();
    };

    const onImageEdit = async (media: MediaFile, file: File) => {
        const response = await replaceMediaFile.mutateAsync({id: media.id, file});
        const replacedMedia = response.media?.[0] || {
            ...media,
            updated_at: new Date().toISOString()
        };

        setSelectedMedia(replacedMedia);
        await refetch();
    };

    const onDeleteMedia = async (media: MediaFile) => {
        await deleteMediaFile.mutateAsync(media.id);
        setSelectedMedia(null);
        navigate(mediaLibraryPath);
        await refetch();
    };

    const handleMobileSearchToggle = () => {
        if (showMobileSearch) {
            setShowMobileSearch(false);
            setMobileSearchOpenedByUser(false);
            return;
        }

        setMobileSearchOpenedByUser(true);
        setShowMobileSearch(true);
    };

    const renderFolderDropdown = (
        isOpen: boolean,
        setIsOpen: (open: boolean) => void,
        align: "start" | "end" = "end"
    ) => (
        <DropdownMenu open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setIsCreatingFolder(false);
                setNewFolderName("");
            }
        }}>
            <DropdownMenuTrigger asChild>
                <Button className="h-[34px] min-w-20 justify-between px-3" type="button" variant="outline">
                    <span className="max-w-28 truncate">{activeFolder?.name || "All"}</span>
                    <LucideIcon.ChevronDown className="ml-2 size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-60">
                <DropdownMenuItem
                    className="gap-2"
                    onSelect={() => selectFolder(null)}
                >
                    <LucideIcon.Check className={`size-4 ${activeFolderId ? "opacity-0" : "opacity-100"}`} />
                    All
                </DropdownMenuItem>
                {folders.map(folder => (
                    <DropdownMenuItem
                        className="gap-2"
                        key={folder.id}
                        onSelect={() => selectFolder(folder)}
                    >
                        <LucideIcon.Check className={`size-4 ${activeFolderId === folder.id ? "opacity-100" : "opacity-0"}`} />
                        {folder.name}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {isCreatingFolder ? (
                    <form className="space-y-3 p-3" onSubmit={(event) => {
                        void onCreateFolder(event);
                    }}>
                        <Input
                            autoFocus
                            className="h-9"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={event => setNewFolderName(event.target.value)}
                            onKeyDown={event => event.stopPropagation()}
                        />
                        <div className="flex justify-end gap-2">
                            <Button className="h-8 px-3" type="button" variant="ghost" onClick={() => {
                                setIsCreatingFolder(false);
                                setNewFolderName("");
                            }}>
                                Cancel
                            </Button>
                            <Button className="h-8 px-3" disabled={addFolder.isLoading} type="submit">
                                Create
                            </Button>
                        </div>
                    </form>
                ) : (
                    <DropdownMenuItem onSelect={(event) => {
                        event.preventDefault();
                        setIsCreatingFolder(true);
                    }}>
                        <LucideIcon.FolderPlus className="mr-2 size-4" />
                        Create folder
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderSortDropdown = (align: "start" | "end" = "end") => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label="Sort options" className="h-[34px] px-3" type="button" variant="outline">
                    <LucideIcon.ArrowDownUp className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                {sortOptions.map(option => (
                    <DropdownMenuCheckboxItem
                        checked={order === option.value}
                        key={option.value}
                        onCheckedChange={() => setOrder(option.value)}
                    >
                        {option.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderViewDropdown = (align: "start" | "end" = "end") => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label="View options" className="h-[34px] px-3" type="button" variant="outline">
                    {view === "list" ? (
                        <LucideIcon.List className="size-4" />
                    ) : (
                        <LucideIcon.Grid2X2 className="size-4" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                <DropdownMenuCheckboxItem
                    checked={view === "grid"}
                    onCheckedChange={() => setView("grid")}
                >
                    <LucideIcon.Grid2X2 className="mr-2 size-4" />
                    Grid
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                    checked={view === "list"}
                    onCheckedChange={() => setView("list")}
                >
                    <LucideIcon.List className="mr-2 size-4" />
                    List
                </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <main className="flex min-h-screen flex-col bg-background">
            <input
                multiple
                className="hidden"
                ref={inputRef}
                type="file"
                onChange={(event) => {
                    void onUpload(event);
                }}
            />
            <div className="sticky top-0 z-50 flex flex-col gap-4 bg-gradient-to-b from-background via-background/70 to-background/70 py-4 backdrop-blur-md sidebar:gap-6 sidebar:py-6 dark:bg-black">
                <ListHeader
                    blurredBackground={false}
                    className="relative flex-nowrap"
                    sticky={false}
                >
                    <ListHeader.Left className="min-w-0">
                        <ListHeader.Title>
                            Media library
                        </ListHeader.Title>
                    </ListHeader.Left>

                    <ListHeader.Actions>
                        <ListHeader.ActionGroup className="ml-auto flex-nowrap justify-end">
                            {!isMobileControlsLayout && (
                                <>
                                    <InputGroup className="h-[34px] min-w-0 basis-full lg:w-[180px] lg:basis-auto xl:w-[240px]">
                                        <InputGroupAddon>
                                            <LucideIcon.Search className="size-4" strokeWidth={1.75} />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            aria-label="Search media"
                                            className="!h-[34px]"
                                            placeholder="Search media..."
                                            value={search}
                                            onChange={event => setSearch(event.target.value)}
                                        />
                                    </InputGroup>

                                    {renderFolderDropdown(isFolderMenuOpen, setIsFolderMenuOpen)}

                                    {!hasFilters && (
                                        <Filters
                                            addButtonClassName={addFilterButtonClassName}
                                            addButtonIcon={<LucideIcon.Funnel />}
                                            addButtonText="Filter"
                                            allowMultiple={false}
                                            className="w-auto [&>button]:order-last"
                                            fields={filterFields}
                                            filters={filters}
                                            keyboardShortcut="f"
                                            popoverAlign="end"
                                            popoverContentClassName="z-[80] w-[280px]"
                                            showSearchInput={false}
                                            onChange={setFilters}
                                        />
                                    )}

                                    {renderSortDropdown()}

                                    {renderViewDropdown()}
                                </>
                            )}

                            <Button className="h-[34px]" disabled={upload.isLoading} type="button" onClick={() => inputRef.current?.click()}>
                                <LucideIcon.Upload className="mr-2 size-4" />
                                {upload.isLoading ? "Uploading" : "Upload"}
                            </Button>
                        </ListHeader.ActionGroup>
                    </ListHeader.Actions>
                </ListHeader>

                {isMobileControlsLayout && (
                    <div className="flex flex-col gap-4 px-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                aria-label={showMobileSearch ? "Hide media search" : "Show media search"}
                                className={cn(showMobileSearch && "bg-secondary hover:bg-secondary")}
                                type="button"
                                variant="outline"
                                onClick={handleMobileSearchToggle}
                            >
                                <LucideIcon.Search className="size-4" />
                            </Button>

                            {renderFolderDropdown(isMobileFolderMenuOpen, setIsMobileFolderMenuOpen, "start")}

                            {!hasFilters && (
                                <Filters
                                    addButtonClassName={addFilterButtonClassName}
                                    addButtonIcon={<LucideIcon.Funnel />}
                                    addButtonText="Filter"
                                    allowMultiple={false}
                                    className="w-auto [&>button]:order-last"
                                    fields={filterFields}
                                    filters={filters}
                                    keyboardShortcut="f"
                                    popoverAlign="start"
                                    popoverContentClassName="z-[80] w-[280px]"
                                    showSearchInput={false}
                                    onChange={setFilters}
                                />
                            )}

                            {renderSortDropdown("start")}

                            {renderViewDropdown("start")}
                        </div>

                        {shouldShowMobileSearchRow && (
                            <div>
                                <InputGroup className="h-[34px] min-w-0 basis-full">
                                    <InputGroupAddon>
                                        <LucideIcon.Search className="size-4" strokeWidth={1.75} />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        aria-label="Search media mobile"
                                        autoFocus={mobileSearchOpenedByUser}
                                        className="!h-[34px]"
                                        placeholder="Search media..."
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                    />
                                </InputGroup>
                            </div>
                        )}
                    </div>
                )}

                {hasFilters && (
                    <div className="flex flex-col gap-4 px-4 sidebar:gap-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
                        <Filters
                            addButtonClassName={addFilterButtonClassName}
                            addButtonIcon={<LucideIcon.FunnelPlus />}
                            addButtonText="Add filter"
                            allowMultiple={false}
                            className="sm:!pr-40 [&>button]:order-last [&>button]:border-none"
                            clearButton={clearFiltersButton}
                            fields={filterFields}
                            filters={filters}
                            keyboardShortcut="f"
                            popoverAlign="start"
                            popoverContentClassName="z-[80] w-[280px]"
                            showClearButton={hasFilters}
                            showSearchInput={false}
                            onChange={setFilters}
                        />
                    </div>
                )}
            </div>

            <div className="flex grow flex-col px-4 pb-4 lg:px-8 lg:pb-8">
                <section className="min-h-[460px]">
                    {isError ? (
                        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
                            <LucideIcon.CircleAlert className="size-8 text-gray-500" />
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Could not load media</h2>
                                <p className="mt-1 text-sm text-gray-600">Try refreshing the library.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => {
                                void refetch();
                            }}>Retry</Button>
                        </div>
                    ) : (isLoading || isResolvingRouteSegment || isInvalidFolder) ? (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                            {Array.from({length: 12}).map((_, index) => (
                                <div className="aspect-square animate-pulse rounded-lg bg-gray-100" key={index} />
                            ))}
                        </div>
                    ) : media.length === 0 ? (
                        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
                            <LucideIcon.Image className="size-9 text-gray-500" />
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">No media found</h2>
                                <p className="mt-1 text-sm text-gray-600">Upload a file or adjust your filters.</p>
                            </div>
                            <Button type="button" onClick={() => inputRef.current?.click()}>
                                <LucideIcon.Upload className="mr-2 size-4" />
                                Upload
                            </Button>
                        </div>
                    ) : view === "list" ? (
                        <Table className="table-fixed" data-testid="media-list">
                            <TableBody>
                                {media.map(item => (
                                    <MediaCard
                                        key={item.id}
                                        media={item}
                                        selected={selectedMediaId === item.id}
                                        view={view}
                                        onSelect={openMediaDetails}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                            {media.map(item => (
                                <MediaCard
                                    key={item.id}
                                    media={item}
                                    selected={selectedMediaId === item.id}
                                    view={view}
                                    onSelect={openMediaDetails}
                                />
                            ))}
                        </div>
                    )}

                    {pagination && pagination.pages > 1 && (
                        <div className="mt-6 flex items-center justify-between border-t pt-4">
                            <div className="text-sm text-gray-600">
                                Page {numberFormatter(pagination.page)} of {numberFormatter(pagination.pages)}
                                {isFetching ? " · Refreshing" : ""}
                            </div>
                            <div className="flex gap-2">
                                <Button disabled={!pagination.prev} type="button" variant="outline" onClick={() => setPage(page - 1)}>Previous</Button>
                                <Button disabled={!pagination.next} type="button" variant="outline" onClick={() => setPage(page + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <MediaDetails
                deleteSaving={deleteMediaFile.isLoading}
                folders={folders}
                imageEditing={imageEditingRoute}
                imageEditingSaving={replaceMediaFile.isLoading}
                media={selectedMediaDetails}
                metadataSaving={editMedia.isLoading}
                usageLoading={isFetchingSelectedMedia}
                onClose={closeMediaDetails}
                onDelete={onDeleteMedia}
                onEditClose={closeMediaEditor}
                onEditStart={openMediaEditor}
                onFolderChange={onFolderChange}
                onFolderCreate={onFolderCreateForMedia}
                onImageEdit={onImageEdit}
                onMetadataSave={onMetadataSave}
            />
        </main>
    );
}
