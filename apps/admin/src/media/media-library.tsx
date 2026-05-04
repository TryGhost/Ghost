import {useDeferredValue, useEffect, useMemo, useRef, useState} from "react";
import type {ChangeEvent, ReactNode} from "react";
import {Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, InputGroup, InputGroupAddon, InputGroupInput, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@tryghost/shade/components";
import {Filters} from "@tryghost/shade/patterns";
import type {Filter, FilterFieldConfig} from "@tryghost/shade/patterns";
import {ListHeader} from "@tryghost/shade/primitives";
import {formatNumber, LucideIcon} from "@tryghost/shade/utils";
import {useBrowseMedia, useUploadMediaFile} from "@tryghost/admin-x-framework/api/media";
import type {MediaFile, MediaSource, MediaType} from "@tryghost/admin-x-framework/api/media";

type ViewMode = "grid" | "list";

const numberFormatter = formatNumber as (value: number) => string;

const fileTypeOptions: Array<{label: string; value: "all" | MediaType}> = [
    {label: "All files", value: "all"},
    {label: "Images", value: "image"},
    {label: "Videos", value: "video"},
    {label: "Audio", value: "audio"},
    {label: "Files", value: "file"}
];

const sourceOptions: Array<{label: string; value: "all" | MediaSource}> = [
    {label: "All sources", value: "all"},
    {label: "Uploads", value: "upload"},
    {label: "Backfilled", value: "backfill"},
    {label: "References", value: "reference"}
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

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
}).format(new Date(value));

const titleForMedia = (media: MediaFile) => media.name || media.url.split("/").pop() || "Untitled file";

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

function MediaPreview({media, className = ""}: {media: MediaFile; className?: string}) {
    const Icon = iconForType(media.media_type);
    const imageUrl = media.thumbnail_url || media.url;

    if (media.media_type === "image") {
        return (
            <div className={`flex items-center justify-center overflow-hidden bg-gray-200 ${className}`}>
                <img
                    alt=""
                    className="size-full object-contain"
                    src={imageUrl}
                />
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}>
            <Icon className="size-9 stroke-[1.5px]" />
        </div>
    );
}

function MetadataRow({label, value}: {label: string; value: ReactNode}) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
            <dt className="text-gray-600">{label}</dt>
            <dd className="min-w-0 font-medium break-words text-gray-900">{value}</dd>
        </div>
    );
}

function MediaCard({media, onSelect, selected, view}: {media: MediaFile; onSelect: (media: MediaFile) => void; selected: boolean; view: ViewMode}) {
    const meta = formatDimensions(media) || formatBytes(media.size_bytes) || media.mime_type;
    const commonClassName = selected ? "border-gray-300 bg-gray-50 ring-2 ring-gray-100" : "border-gray-200";

    if (view === "list") {
        return (
            <button
                className={`flex min-h-20 w-full items-center gap-4 rounded-lg border bg-white p-3 text-left transition hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:outline-hidden ${commonClassName}`}
                type="button"
                onClick={() => onSelect(media)}
            >
                <MediaPreview className="size-14 shrink-0 rounded-md" media={media} />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{titleForMedia(media)}</div>
                    <div className="mt-1 text-sm text-gray-600">{media.extension?.toUpperCase() || media.media_type}{meta ? ` · ${meta}` : ""}</div>
                </div>
                <div className="hidden text-sm text-gray-600 md:block">{formatDate(media.created_at)}</div>
            </button>
        );
    }

    return (
        <button
            className={`block w-full overflow-hidden rounded-lg border bg-white text-left transition hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:outline-hidden ${commonClassName}`}
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

function MediaDetails({media, onClose}: {media: MediaFile | null; onClose: () => void}) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setCopied(false);
    }, [media?.id]);

    const copyUrl = async () => {
        if (!media) {
            return;
        }

        await navigator.clipboard.writeText(media.url);
        setCopied(true);
    };

    return (
        <Sheet open={!!media} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-lg">
                {media && (
                    <>
                        <SheetHeader className="border-b p-6 pr-12">
                            <SheetTitle className="truncate">{titleForMedia(media)}</SheetTitle>
                            <SheetDescription>Media file details and usage.</SheetDescription>
                        </SheetHeader>

                        <div className="space-y-6 p-6">
                            <MediaPreview className="aspect-video w-full rounded-lg" media={media} />

                            <div className="flex gap-2">
                                <Button className="grow" type="button" onClick={() => {
                                    void copyUrl();
                                }}>
                                    <LucideIcon.Copy className="mr-2 size-4" />
                                    {copied ? "Copied" : "Copy URL"}
                                </Button>
                                <Button asChild variant="outline">
                                    <a href={media.url} rel="noreferrer" target="_blank">
                                        <LucideIcon.ExternalLink className="mr-2 size-4" />
                                        Open
                                    </a>
                                </Button>
                            </div>

                            <Separator />

                            <dl className="space-y-3">
                                <MetadataRow label="URL" value={media.url} />
                                <MetadataRow label="Type" value={media.mime_type || media.media_type} />
                                <MetadataRow label="Dimensions" value={formatDimensions(media)} />
                                <MetadataRow label="Size" value={formatBytes(media.size_bytes)} />
                                <MetadataRow label="Source" value={media.source} />
                                <MetadataRow label="Storage" value={media.storage_type} />
                                <MetadataRow label="Added" value={formatDate(media.created_at)} />
                            </dl>

                            <Separator />

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900">Usage</h3>
                                {media.usages?.length ? (
                                    <div className="space-y-2">
                                        {media.usages.map(usage => (
                                            <div className="rounded-md border p-3 text-sm" key={usage.id}>
                                                <div className="font-medium text-gray-900">{usage.resource_type}</div>
                                                <div className="mt-1 break-words text-gray-600">{usage.field} · {usage.resource_id}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">No tracked usage yet.</p>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

export default function MediaLibrary() {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search.trim());
    const [filters, setFilters] = useState<Filter<string>[]>([]);
    const [order, setOrder] = useState("created_at desc");
    const [view, setView] = useState<ViewMode>("grid");
    const [page, setPage] = useState(1);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const upload = useUploadMediaFile();

    useEffect(() => {
        setPage(1);
    }, [deferredSearch, filters, order]);

    const filterFields = useMemo<FilterFieldConfig<string>[]>(
        () => [
            {
                key: "media_type",
                label: "File type",
                type: "select",
                icon: <LucideIcon.File className="size-4" />,
                options: fileTypeOptions
                    .filter((option): option is {label: string; value: MediaType} => option.value !== "all")
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
            .join("+");

        return {
            limit: "30",
            page: page.toString(),
            order,
            ...(deferredSearch ? {search: deferredSearch} : {}),
            ...(filter ? {filter} : {})
        };
    }, [deferredSearch, filters, order, page]);

    const {data, isFetching, isLoading, isError, refetch} = useBrowseMedia({searchParams});
    const media = data?.media || [];
    const pagination = data?.meta?.pagination;
    const hasFilters = filters.length > 0;
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
            await upload.mutateAsync({file});
        }

        await refetch();
        event.target.value = "";
    };

    return (
        <main className="flex min-h-screen flex-col bg-background">
            <div className="sticky top-0 z-50 flex flex-col gap-4 bg-gradient-to-b from-background via-background/70 to-background/70 py-4 backdrop-blur-md sidebar:gap-6 sidebar:py-6 dark:bg-black">
                <ListHeader
                    blurredBackground={false}
                    className="relative"
                    sticky={false}
                >
                    <ListHeader.Left>
                        <ListHeader.Title>
                            Media library
                        </ListHeader.Title>
                    </ListHeader.Left>

                    <ListHeader.Actions>
                        <ListHeader.ActionGroup className="ml-auto flex-wrap justify-end sm:ml-0 sm:flex-nowrap">
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

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-label="Sort options" className="h-[34px] px-3" type="button" variant="outline">
                                        <LucideIcon.ArrowDownUp className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-label="View options" className="h-[34px] px-3" type="button" variant="outline">
                                        <LucideIcon.Grid2X2 className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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

                            <input
                                multiple
                                className="hidden"
                                ref={inputRef}
                                type="file"
                                onChange={(event) => {
                                    void onUpload(event);
                                }}
                            />
                            <Button className="h-[34px]" disabled={upload.isLoading} type="button" onClick={() => inputRef.current?.click()}>
                                <LucideIcon.Upload className="mr-2 size-4" />
                                {upload.isLoading ? "Uploading" : "Upload"}
                            </Button>
                        </ListHeader.ActionGroup>
                    </ListHeader.Actions>
                </ListHeader>

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
                    ) : isLoading ? (
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
                    ) : (
                        <div className={view === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" : "space-y-3"}>
                            {media.map(item => (
                                <MediaCard
                                    key={item.id}
                                    media={item}
                                    selected={selectedMedia?.id === item.id}
                                    view={view}
                                    onSelect={setSelectedMedia}
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

            <MediaDetails media={selectedMedia} onClose={() => setSelectedMedia(null)} />
        </main>
    );
}
