import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useState} from 'react';
import {Button, EmptyIndicator, Input, LoadingIndicator, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {InfiniteScrollListener, Modal} from '@tryghost/admin-x-design-system';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {type MediaLibraryItem, type MediaUsage, type MediaUsageField, useBrowseMediaLibrary} from '@tryghost/admin-x-framework/api/media-library';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

// How many tiles to render per scroll batch. Keeps the DOM small and, with
// lazy-loaded images, means we never fetch all image files at once.
const BATCH_SIZE = 48;

type MediaKind = 'image' | 'video' | 'audio' | 'file';
export type KindFilter = 'all' | MediaKind;

// The backend types video and audio both as `media` (both live under
// /content/media/), so we split them by extension on the client.
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'aac', 'flac', 'opus', 'oga', 'ogg', 'weba', 'mid', 'midi']);

const getKind = (item: MediaLibraryItem): MediaKind => {
    if (item.type === 'image') {
        return 'image';
    }
    if (item.type === 'file') {
        return 'file';
    }
    const ext = item.filename.split('.').pop()?.toLowerCase() || '';
    return AUDIO_EXTENSIONS.has(ext) ? 'audio' : 'video';
};

const KIND_META: Record<MediaKind, {label: string; singular: string; Icon: React.ElementType}> = {
    image: {label: 'Images', singular: 'Image', Icon: LucideIcon.Image},
    video: {label: 'Video', singular: 'Video', Icon: LucideIcon.Video},
    audio: {label: 'Audio', singular: 'Audio', Icon: LucideIcon.Music},
    file: {label: 'Files', singular: 'File', Icon: LucideIcon.File}
};

const FILTER_ORDER: KindFilter[] = ['all', 'image', 'video', 'audio', 'file'];
const filterLabel = (kind: KindFilter) => (kind === 'all' ? 'All' : KIND_META[kind].label);

// Upload-button label, reflecting the card the picker was opened for: [singular,
// plural]. Plural is used when the card accepts several files (e.g. a gallery).
const UPLOAD_LABELS: Record<KindFilter, [string, string]> = {
    all: ['Upload', 'Upload'],
    image: ['Upload image', 'Upload images'],
    video: ['Upload video', 'Upload videos'],
    audio: ['Upload audio', 'Upload audio'],
    file: ['Upload file', 'Upload files']
};
const uploadButtonLabel = (kind: KindFilter, multiple?: boolean) => UPLOAD_LABELS[kind][multiple ? 1 : 0];

type SortOption = 'newest' | 'oldest' | 'most-used';
const SORT_OPTIONS: {label: string; value: SortOption}[] = [
    {label: 'Newest first', value: 'newest'},
    {label: 'Oldest first', value: 'oldest'},
    {label: 'Most used first', value: 'most-used'}
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Upload month encoded in the storage path (/content/.../YYYY/MM/...).
const getUploadParts = (item: MediaLibraryItem) => item.url.match(/\/(\d{4})\/(\d{2})\//);
const getUploadOrder = (item: MediaLibraryItem): number => {
    const match = getUploadParts(item);
    return match ? (Number(match[1]) * 100 + Number(match[2])) : 0;
};
const getUploadLabel = (item: MediaLibraryItem): string | null => {
    const match = getUploadParts(item);
    return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : null;
};

const FIELD_LABELS: Record<MediaUsageField, string> = {
    feature_image: 'Feature image',
    body: 'In post body',
    og_image: 'Social image',
    twitter_image: 'Social image'
};
const usageFieldLabels = (usage: MediaUsage) => [...new Set(usage.fields.map(field => FIELD_LABELS[field]))];

// When the library is opened as a picker (from the editor) it is handed a
// selection config. In manage mode (Settings) it is omitted and the library is
// read-only: view details and download only.
export type MediaSelection = {
    // Pick several items before inserting (e.g. a gallery). When false the first
    // click inserts immediately and closes.
    multiple?: boolean;
    onInsert: (items: MediaLibraryItem[]) => void;
};

// Hover/detail action label, shared by the tile chip and the detail button so
// the two never drift. Single: one click inserts. Multiple: toggle then insert.
const actionLabel = (selection: MediaSelection, selected: boolean) => {
    if (!selection.multiple) {
        return 'Insert';
    }
    return selected ? 'Selected' : 'Select';
};

// Hover-overlay action chip. Intentionally a white chip (like the Unsplash
// selector) since it sits over media thumbnails and should stay readable in
// both themes regardless of the surface behind it.
const overlayButtonClass = 'flex h-8 shrink-0 items-center gap-1 rounded-md bg-white px-3 text-sm font-medium leading-6 text-black opacity-90 transition-opacity hover:opacity-100';

const MediaTile: React.FC<{
    item: MediaLibraryItem;
    onView: (item: MediaLibraryItem) => void;
    selection?: MediaSelection;
    selected: boolean;
    onAction?: (item: MediaLibraryItem) => void;
}> = ({item, onView, selection, selected, onAction}) => {
    const kind = getKind(item);
    const {Icon: KindIcon} = KIND_META[kind];

    return (
        <div
            className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-shadow ${selected ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
            onClick={() => onView(item)}
        >
            <div className='flex aspect-square items-center justify-center bg-muted'>
                {kind === 'image' ? (
                    <img alt={item.filename} className='h-full w-full object-cover' loading='lazy' src={item.url} />
                ) : (
                    <KindIcon className='size-1/4 -translate-y-3 text-muted-foreground' strokeWidth={1.5} />
                )}
            </div>

            {/* Name + usage, always visible. Images get a dark scrim for legibility
                over the photo; non-image tiles sit on the light surface, so they use
                normal text tokens with no gradient (a dark scrim looks harsh there). */}
            {kind === 'image' ? (
                <div className='pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-3 pt-10 pb-3'>
                    <div className='truncate text-sm font-medium text-white' title={item.filename}>{item.filename}</div>
                    <div className='text-xs text-white/80'>Used in {formatNumber(item.count)} {item.count === 1 ? 'place' : 'places'}</div>
                </div>
            ) : (
                <div className='pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3'>
                    <div className='truncate text-sm font-medium text-foreground' title={item.filename}>{item.filename}</div>
                    <div className='text-xs text-muted-foreground'>Used in {formatNumber(item.count)} {item.count === 1 ? 'place' : 'places'}</div>
                </div>
            )}

            {/* Selected badge (multi-select only), so the choice reads at a glance. */}
            {selection?.multiple && selected && (
                <div className='absolute top-3 left-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <LucideIcon.Check className='size-4' />
                </div>
            )}

            {/* Action chips. The select/insert chip stays visible while an item is
                selected so it can be toggled off; otherwise chips reveal on hover. */}
            <div className={`absolute top-3 right-3 flex items-center gap-2 transition-opacity duration-150 group-hover:opacity-100 ${selected ? 'opacity-100' : 'opacity-0'}`}>
                {selection && onAction && (
                    <button
                        className={overlayButtonClass}
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction(item);
                        }}
                    >
                        {actionLabel(selection, selected)}
                    </button>
                )}
                <a
                    className={overlayButtonClass}
                    href={item.url}
                    rel='noopener noreferrer'
                    target='_blank'
                    title='Download'
                    download
                    onClick={e => e.stopPropagation()}
                >
                    <LucideIcon.Download className='size-4' />
                </a>
            </div>
        </div>
    );
};

const MediaPreview: React.FC<{item: MediaLibraryItem; kind: MediaKind}> = ({item, kind}) => {
    if (kind === 'image') {
        return <img alt={item.filename} className='max-h-full max-w-full object-contain' src={item.url} />;
    }
    if (kind === 'video') {
        return <video className='max-h-full max-w-full' preload='metadata' src={item.url} controls />;
    }
    if (kind === 'audio') {
        return (
            <div className='flex w-full max-w-xl flex-col items-center gap-6 p-8'>
                <LucideIcon.Music className='size-16 text-muted-foreground' strokeWidth={1.5} />
                <audio className='w-full' preload='metadata' src={item.url} controls />
            </div>
        );
    }
    return (
        <div className='flex flex-col items-center gap-4 p-8 text-center'>
            <LucideIcon.File className='size-16 text-muted-foreground' strokeWidth={1.5} />
            <div className='max-w-xs text-sm font-medium break-words text-muted-foreground'>{item.filename}</div>
        </div>
    );
};

const UsageRow: React.FC<{usage: MediaUsage}> = ({usage}) => {
    const ResourceIcon = usage.type === 'page' ? LucideIcon.File : LucideIcon.FileText;
    const href = `${getGhostPaths().adminRoot}#/editor/${usage.type}/${usage.id}`;

    return (
        <a
            className='group/row block rounded-md p-2 transition-colors hover:bg-muted'
            href={href}
            rel='noopener noreferrer'
            target='_blank'
        >
            <div className='flex items-center gap-2'>
                <ResourceIcon className='size-4 shrink-0 text-muted-foreground' />
                <span className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'>{usage.title || 'Untitled'}</span>
                <LucideIcon.ExternalLink className='size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100' />
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-1 pl-6'>
                <span className='rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground capitalize'>{usage.status}</span>
                {usageFieldLabels(usage).map(label => (
                    <span key={label} className='rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>{label}</span>
                ))}
            </div>
        </a>
    );
};

const MediaDetail: React.FC<{
    item: MediaLibraryItem;
    selection?: MediaSelection;
    selected: boolean;
    onAction?: (item: MediaLibraryItem) => void;
}> = ({item, selection, selected, onAction}) => {
    const kind = getKind(item);
    const uploadLabel = getUploadLabel(item);

    return (
        <div className='flex flex-col md:h-full'>
            <div className='flex flex-1 flex-col gap-8 md:min-h-0 md:flex-row'>
                <div className='flex w-full items-center justify-center overflow-hidden rounded-lg bg-muted md:min-h-0 md:w-auto md:flex-1'>
                    <MediaPreview item={item} kind={kind} />
                </div>

                <aside className='flex w-full shrink-0 flex-col gap-6 md:w-80 md:overflow-hidden'>
                    <div className='flex flex-col gap-4'>
                        <div>
                            <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Filename</div>
                            <div className='mt-1 text-sm break-words text-foreground'>{item.filename}</div>
                        </div>
                        <div>
                            <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Type</div>
                            <div className='mt-1 text-sm text-foreground'>{KIND_META[kind].singular}</div>
                        </div>
                        {uploadLabel && (
                            <div>
                                <div className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Uploaded</div>
                                <div className='mt-1 text-sm text-foreground'>{uploadLabel}</div>
                            </div>
                        )}
                    </div>

                    <div className='flex flex-col gap-2'>
                        {selection && onAction && (
                            <Button
                                className='w-full'
                                variant={selection.multiple && selected ? 'outline' : 'default'}
                                onClick={() => onAction(item)}
                            >
                                {selection.multiple && selected && <LucideIcon.Check />}
                                {actionLabel(selection, selected)}
                            </Button>
                        )}
                        {/* text-foreground! overrides the host page's unlayered link
                            color, which would otherwise tint this anchor green. */}
                        <Button className='w-full text-foreground!' variant='outline' asChild>
                            <a href={item.url} rel='noopener noreferrer' target='_blank' download>
                                <LucideIcon.Download /> Download
                            </a>
                        </Button>
                    </div>

                    <div className='flex flex-col border-t border-border pt-5 md:min-h-0 md:flex-1'>
                        <h3 className='mb-2 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                            Used in {formatNumber(item.count)} {item.count === 1 ? 'place' : 'places'}
                        </h3>
                        <div className='flex flex-col gap-0.5 md:flex-1 md:overflow-x-hidden md:overflow-y-auto'>
                            {item.used_in.map(usage => <UsageRow key={`${usage.type}:${usage.id}`} usage={usage} />)}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

// Shared library body, used both as the read-only manager (Settings) and as a
// picker (editor). The only difference is the `selection` prop: when present,
// tiles and the detail view gain an insert/select action and, in multiple mode,
// a footer bar to insert the whole selection at once.
export const MediaLibrary: React.FC<{selection?: MediaSelection; cardKind?: KindFilter; onUpload?: () => void; onClose: () => void}> = ({selection, cardKind, onUpload, onClose}) => {
    // When opened for a single-type card (image/video/audio) the picker is locked
    // to that type: only matching media shows and the type filter offers only that
    // one option, so an incompatible item can never be selected. 'all' and the file
    // card (which accepts anything) stay unlocked and browse everything.
    const lockedKind = cardKind && cardKind !== 'all' && cardKind !== 'file' ? cardKind : null;
    // Cache results so reopening renders instantly. Within the staleTime window
    // reopening hits no server scan at all; after it, React Query serves the
    // cached data immediately and refreshes in the background.
    const {data, isLoading, isError, refetch} = useBrowseMediaLibrary({staleTime: 30 * 1000});

    const [search, setSearch] = useState('');
    const [kind, setKind] = useState<KindFilter>(lockedKind ?? 'all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const [detailItem, setDetailItem] = useState<MediaLibraryItem | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const items = useMemo(() => data?.media_library || [], [data]);
    const selectedItems = useMemo(() => items.filter(item => selectedKeys.has(item.url)), [items, selectedKeys]);

    const insert = (list: MediaLibraryItem[]) => {
        if (list.length === 0) {
            return;
        }
        selection?.onInsert(list);
        onClose();
    };

    const toggle = (item: MediaLibraryItem) => setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(item.url)) {
            next.delete(item.url);
        } else {
            next.add(item.url);
        }
        return next;
    });

    // Single select inserts on first click; multiple toggles into the selection.
    const handleAction = selection
        ? (item: MediaLibraryItem) => (selection.multiple ? toggle(item) : insert([item]))
        : undefined;

    const counts = useMemo(() => {
        const result: Record<KindFilter, number> = {all: items.length, image: 0, video: 0, audio: 0, file: 0};
        for (const item of items) {
            result[getKind(item)] += 1;
        }
        return result;
    }, [items]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return items.filter((item) => {
            if (kind !== 'all' && getKind(item) !== kind) {
                return false;
            }
            if (!term) {
                return true;
            }
            const haystack = [item.filename, ...item.used_in.map(usage => usage.title)].join(' ').toLowerCase();
            return haystack.includes(term);
        });
    }, [items, search, kind]);

    const sorted = useMemo(() => {
        const list = [...filtered];
        list.sort((a, b) => {
            if (sortBy === 'most-used') {
                return b.count - a.count || a.filename.localeCompare(b.filename);
            }
            const diff = getUploadOrder(a) - getUploadOrder(b);
            return (sortBy === 'newest' ? -diff : diff) || a.filename.localeCompare(b.filename);
        });
        return list;
    }, [filtered, sortBy]);

    // Reset the visible window whenever the result set changes.
    useEffect(() => {
        setVisibleCount(BATCH_SIZE);
    }, [search, kind]);

    // While viewing an asset, Escape goes back to the grid (not closing the modal).
    useEffect(() => {
        if (!detailItem) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setDetailItem(null);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [detailItem]);

    const visible = sorted.slice(0, visibleCount);
    const hasMore = visibleCount < sorted.length;
    const EmptyIcon = kind === 'all' ? LucideIcon.Images : KIND_META[kind].Icon;
    // Locked pickers offer only their card's type; everything else offers all types.
    const filterOptions: KindFilter[] = lockedKind ? [lockedKind] : FILTER_ORDER;
    // Search/filter miss: echo the query, the way the Settings search does.
    const searchTerm = search.trim();
    const noMatchDescription = searchTerm
        ? `We couldn't find any media matching '${searchTerm}'.`
        : 'Try a different search or filter.';

    return (
        // The design-system Modal's content wrapper is a flex child with `grow` but no
        // `min-h-0`, so percentage heights (`h-full`) don't reliably resolve through it.
        // We anchor our layout with `absolute inset-0` (the Modal section is sized and
        // clips overflow), giving every descendant a definite height to resolve against —
        // the same approach the design-system's own preview-modal uses for its scroll regions.
        <div className='absolute inset-0 flex flex-col pt-10'>
            <button className='absolute top-6 right-6 z-10 cursor-pointer text-muted-foreground transition-colors hover:text-foreground' type='button' onClick={onClose}>
                <LucideIcon.X className='size-5' />
            </button>
            {!detailItem && (
                <header className='shrink-0 px-10 pb-6'>
                    <h1 className='text-3xl font-bold tracking-tight text-foreground'>
                        Media library
                    </h1>
                </header>
            )}

            {!detailItem && (
                <div className='flex shrink-0 flex-wrap items-center gap-2 px-10 pb-6'>
                    <div className='relative w-full md:w-auto md:max-w-xs md:flex-1'>
                        <LucideIcon.Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                        <Input
                            aria-label='Search media'
                            className='rounded-full pl-9'
                            placeholder='Search media'
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Always shown for consistent feedback on what's displayed. When
                        locked to a card's type, that type is the only option. */}
                    <Select value={kind} onValueChange={value => setKind(value as KindFilter)}>
                        <SelectTrigger className='flex-1 md:w-[180px] md:flex-none'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {filterOptions.map(value => (
                                <SelectItem key={value} value={value}>{filterLabel(value)} ({formatNumber(counts[value])})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
                        <SelectTrigger className='flex-1 md:w-[160px] md:flex-none'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {detailItem && (
                <div className='shrink-0 px-10 pb-4'>
                    <button className='flex items-center gap-1.5 text-[15px] font-semibold text-foreground' type='button' onClick={() => setDetailItem(null)}>
                        <LucideIcon.ChevronLeft className='size-4' /> Back
                    </button>
                </div>
            )}

            <div className='relative min-h-0 flex-1 overflow-hidden'>
                <div className='relative size-full overflow-y-auto px-10 pb-10'>
                    {isLoading ? (
                        <div className='flex h-full items-center justify-center'>
                            <LoadingIndicator size='lg' />
                        </div>
                    ) : detailItem ? (
                        <MediaDetail item={detailItem} selected={selectedKeys.has(detailItem.url)} selection={selection} onAction={handleAction} />
                    ) : isError ? (
                        // A failed load must not look like an empty library.
                        <div className='flex h-full flex-col items-center justify-center gap-6'>
                            <EmptyIndicator
                                description='Something went wrong loading your media. Please try again.'
                                title="Couldn't load your media library"
                            >
                                <LucideIcon.TriangleAlert />
                            </EmptyIndicator>
                            <Button variant='outline' onClick={() => refetch()}>Try again</Button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className='flex h-full items-center justify-center'>
                            <EmptyIndicator
                                // Empty library gets a positive one-liner; nothing to reuse
                                // yet, so the upload action sits in the indicator's own
                                // actions slot (consistent spacing). Search/filter misses
                                // keep the "try again" hint.
                                actions={items.length === 0 && onUpload ? (
                                    <Button onClick={onUpload}>
                                        <LucideIcon.Upload />
                                        {uploadButtonLabel(cardKind ?? 'all', selection?.multiple)}
                                    </Button>
                                ) : undefined}
                                description={items.length === 0 ? undefined : noMatchDescription}
                                title={items.length === 0 ? 'Your media will appear here' : 'No media found'}
                            >
                                <EmptyIcon />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <>
                            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'>
                                {visible.map(item => (
                                    <MediaTile
                                        key={item.url}
                                        item={item}
                                        selected={selectedKeys.has(item.url)}
                                        selection={selection}
                                        onAction={handleAction}
                                        onView={setDetailItem}
                                    />
                                ))}
                            </div>
                            {hasMore && <InfiniteScrollListener offset={250} onTrigger={() => setVisibleCount(count => count + BATCH_SIZE)} />}
                        </>
                    )}
                </div>
            </div>

            {/* Footer (grid view only): the upload escape hatch and, in multi-select,
                the bar to insert the whole selection. Soft top shadow matches the
                design-system sticky footer. */}
            {!detailItem && items.length > 0 && (onUpload || (selection?.multiple && selectedItems.length > 0)) && (
                <footer className='flex shrink-0 items-center justify-between gap-4 px-10 py-4 shadow-[0_0_0_1px_rgba(0,0,0,.025),0_-8px_16px_-3px_rgba(0,0,0,.08)]'>
                    <span className='text-sm text-muted-foreground'>
                        {selection?.multiple && selectedItems.length > 0 ? `${formatNumber(selectedItems.length)} selected` : ''}
                    </span>
                    <div className='flex items-center gap-3'>
                        {onUpload && (
                            // Primary on its own; steps back to outline when an insert
                            // action is also present so the selection stays the focus.
                            <Button variant={selection?.multiple && selectedItems.length > 0 ? 'outline' : 'default'} onClick={onUpload}>
                                <LucideIcon.Upload />
                                {uploadButtonLabel(cardKind ?? 'all', selection?.multiple)}
                            </Button>
                        )}
                        {selection?.multiple && selectedItems.length > 0 && (
                            <Button onClick={() => insert(selectedItems)}>Insert {formatNumber(selectedItems.length)}</Button>
                        )}
                    </div>
                </footer>
            )}
        </div>
    );
};

// Settings entry point: opens the library in read-only manage mode (no selection).
const MediaLibraryModal: React.FC = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    const close = () => {
        modal.remove();
        updateRoute('media-library');
    };

    return (
        <Modal
            afterClose={() => updateRoute('media-library')}
            footer={false}
            header={false}
            padding={false}
            scrolling={false}
            size='full'
            testId='media-library-modal'
            hideXOnMobile
            onCancel={close}
        >
            <MediaLibrary onClose={close} />
        </Modal>
    );
};

export default NiceModal.create(MediaLibraryModal);
