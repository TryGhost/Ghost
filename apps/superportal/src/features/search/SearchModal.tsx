import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactElement,
    type ReactNode
} from 'react';
import type {Services} from '../../types';
import {cn} from '../../shared/cn';
import {CloseIcon} from '../../shared/icons/CloseIcon';
import type {AuthorRecord, PostRecord, SearchResults, TagRecord} from './use-search';
import {useSearch} from './use-search';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
    services: Services;
    onClose(): void;
}

// ---------------------------------------------------------------------------
// Icon components (inline SVG — no external dep required)
// ---------------------------------------------------------------------------

function SearchIcon(): ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="16" width="16" aria-hidden="true" focusable="false">
            <path d="M23.38,21.62l-6.53-6.53a9.15,9.15,0,0,0,1.9-5.59,9.27,9.27,0,1,0-3.66,7.36l6.53,6.53a1.26,1.26,0,0,0,1.76,0A1.25,1.25,0,0,0,23.38,21.62ZM2.75,9.5A6.75,6.75,0,1,1,9.5,16.25,6.76,6.76,0,0,1,2.75,9.5Z" fill="currentColor" />
        </svg>
    );
}

function SpinnerIcon(): ReactElement {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="gh-search-spinner gh:flex-none">
            <g fill="#40413F">
                <path d="M8 16a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zM8 2a6 6 0 1 0 6 6 6.006 6.006 0 0 0-6-6z" fill="#D4D4D4" />
                <path d="M8 0v2a6.006 6.006 0 0 1 6 6h2a8.009 8.009 0 0 0-8-8z" />
            </g>
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Highlight helpers (ported from sodo-search popup-modal.js)
// ---------------------------------------------------------------------------

interface HighlightPart {
    text: string;
    type: 'normal' | 'highlight';
}

function getMatchIndexes(
    text: string,
    highlight: string
): Array<{startIdx: number; endIdx: number}> {
    if (!text || !highlight) return [];

    let regexSrc = '';
    highlight.split(' ').forEach((word, idx) => {
        const escaped = word.replace(/\W/g, '\\$&');
        if (!escaped) return;
        const part = `^${escaped}|\\s${escaped}`;
        regexSrc = idx === 0 ? part : `${regexSrc}|${part}`;
    });
    if (!regexSrc) return [];

    const re = new RegExp(regexSrc, 'ig');
    const indexes: Array<{startIdx: number; endIdx: number}> = [];
    for (const match of text.matchAll(re)) {
        indexes.push({
            startIdx: match.index ?? 0,
            endIdx: (match.index ?? 0) + match[0].length
        });
    }
    return indexes;
}

function getHighlightParts(
    text: string,
    highlight: string
): {parts: HighlightPart[]; indexes: Array<{startIdx: number; endIdx: number}>} {
    const indexes = getMatchIndexes(text, highlight);
    const parts: HighlightPart[] = [];
    let last = 0;

    for (const {startIdx, endIdx} of indexes) {
        if (last < startIdx) {
            parts.push({text: text.slice(last, startIdx), type: 'normal'});
        }
        parts.push({text: text.slice(startIdx, endIdx), type: 'highlight'});
        last = endIdx;
    }
    if (last < text.length) {
        parts.push({text: text.slice(last), type: 'normal'});
    }

    return {parts, indexes};
}

interface HighlightedSectionProps {
    text: string;
    highlight: string;
    isExcerpt: boolean;
}

function HighlightedSection({text, highlight, isExcerpt}: HighlightedSectionProps): ReactElement {
    let displayText = text;
    let {parts, indexes} = getHighlightParts(displayText, highlight);

    if (isExcerpt && indexes[0] && (indexes[0].startIdx > 50)) {
        displayText = '...' + displayText.slice(indexes[0].startIdx - 20);
        ({parts} = getHighlightParts(displayText, highlight));
    }

    return (
        <>
            {parts.map((p, i) =>
                p.type === 'highlight'
                    ? <span key={i} className={cn('gh:font-bold', !isExcerpt && 'gh:text-[#15171a]')}>{p.text}</span>
                    : <span key={i}>{p.text}</span>
            )}
        </>
    );
}

// Shared classes — keep visually identical layout across post / author / tag rows.
const RESULT_ITEM_BASE = 'gh:flex gh:py-3 gh:-mx-4 gh:px-4 gh:cursor-pointer gh:sm:-mx-7 gh:sm:px-7';
const RESULT_ITEM_SELECTED = 'gh:bg-[#f5f6f7]';
const RESULT_TITLE = 'gh:text-[16.5px] gh:font-medium gh:text-[#15171a] gh:leading-tight gh:overflow-hidden gh:text-ellipsis gh:whitespace-nowrap gh:max-w-full';
const RESULT_EXCERPT = 'gh:text-[13px] gh:text-[#95a1ae] gh:leading-normal gh:overflow-hidden gh:text-ellipsis gh:whitespace-nowrap gh:mt-[2px] gh:max-w-full';

// ---------------------------------------------------------------------------
// Result list items
// ---------------------------------------------------------------------------

interface PostListItemProps {
    post: PostRecord;
    query: string;
    isSelected: boolean;
    onSelect(): void;
}

function PostListItem({post, query, isSelected, onSelect}: PostListItemProps): ReactElement {
    const {title, excerpt, url} = post;

    const handleClick = (): void => {
        if (url) {
            window.location.href = url;
        }
    };

    return (
        <div
            className={cn(
                RESULT_ITEM_BASE,
                'gh:flex-col gh:items-start gh:gap-1',
                isSelected && RESULT_ITEM_SELECTED
            )}
            onClick={handleClick}
            onMouseEnter={onSelect}
            role="option"
            aria-selected={isSelected}
        >
            <div className={RESULT_TITLE}>
                <HighlightedSection text={title} highlight={query} isExcerpt={false} />
            </div>
            {excerpt ? (
                <div className={RESULT_EXCERPT}>
                    <HighlightedSection text={excerpt} highlight={query} isExcerpt={true} />
                </div>
            ) : null}
        </div>
    );
}

interface AuthorListItemProps {
    author: AuthorRecord;
    isSelected: boolean;
    onSelect(): void;
}

// w-7 h-7 = 28px in superportal v4 (1.75rem at 16px root), matching sodo-search.
const AVATAR_BASE = 'gh:w-7 gh:h-7 gh:rounded-full gh:bg-[#ebeef0] gh:flex-none';

function AuthorAvatar({name, avatar}: {name: string; avatar: string | null}): ReactElement {
    if (avatar) {
        return <img className={cn(AVATAR_BASE, 'gh:object-cover')} src={avatar} alt={name} />;
    }
    return (
        <div
            className={cn(AVATAR_BASE, 'gh:flex gh:items-center gh:justify-center gh:text-[13px] gh:font-bold gh:text-[#95a1ae]')}
            aria-hidden="true"
        >
            <span>{name.charAt(0)}</span>
        </div>
    );
}

function AuthorListItem({author, isSelected, onSelect}: AuthorListItemProps): ReactElement {
    const {name, profile_image: profileImage, url} = author;

    const handleClick = (): void => {
        if (url) {
            window.location.href = url;
        }
    };

    return (
        <div
            className={cn(
                RESULT_ITEM_BASE,
                'gh:items-center gh:gap-3',
                isSelected && RESULT_ITEM_SELECTED
            )}
            onClick={handleClick}
            onMouseEnter={onSelect}
            role="option"
            aria-selected={isSelected}
        >
            <AuthorAvatar name={name} avatar={profileImage} />
            <div className={RESULT_TITLE}>{name}</div>
        </div>
    );
}

interface TagListItemProps {
    tag: TagRecord;
    isSelected: boolean;
    onSelect(): void;
}

function TagListItem({tag, isSelected, onSelect}: TagListItemProps): ReactElement {
    const {name, url} = tag;

    const handleClick = (): void => {
        if (url) {
            window.location.href = url;
        }
    };

    return (
        <div
            className={cn(
                RESULT_ITEM_BASE,
                'gh:items-center gh:gap-3',
                isSelected && RESULT_ITEM_SELECTED
            )}
            onClick={handleClick}
            onMouseEnter={onSelect}
            role="option"
            aria-selected={isSelected}
        >
            <span className="gh:text-[13px] gh:font-bold gh:text-[#95a1ae] gh:flex-none" aria-hidden="true">#</span>
            <div className={RESULT_TITLE}>{name}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Result sections
// ---------------------------------------------------------------------------

const DEFAULT_MAX_POSTS = 10;
const STEP_MAX_POSTS = 10;

interface ResultsSectionProps<T> {
    label: string;
    items: T[];
    renderItem: (item: T, idx: number) => ReactNode;
}

function ResultsSection<T>({label, items, renderItem}: ResultsSectionProps<T>): ReactElement | null {
    if (items.length === 0) return null;
    return (
        <div className="gh:border-t gh:border-[#ebeef0] gh:py-3 gh:px-4 gh:sm:px-7">
            <div className="gh:text-xs gh:font-semibold gh:uppercase gh:tracking-wide gh:text-[#a3a3a3] gh:mb-1">{label}</div>
            {items.map(renderItem)}
        </div>
    );
}

interface AllResultsProps {
    results: SearchResults;
    query: string;
    t: Services['t'];
}

function AllResults({results, query, t}: AllResultsProps): ReactElement | null {
    const [maxPosts, setMaxPosts] = useState(DEFAULT_MAX_POSTS);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Flat list for keyboard nav: authors → tags → posts
    const allItems = useMemo<Array<{id: string; url: string | undefined}>>(
        () => [
            ...results.authors.map(a => ({id: a.id, url: a.url})),
            ...results.tags.map(t2 => ({id: t2.id, url: t2.url})),
            ...results.posts.slice(0, maxPosts + 1).map(p => ({id: p.id, url: p.url}))
        ],
        [results, maxPosts]
    );

    const [selectedId, setSelectedId] = useState<string | null>(() => allItems[0]?.id ?? null);

    // Reset selection when results change.
    useEffect(() => {
        setSelectedId(allItems[0]?.id ?? null);
    }, [allItems]);

    // Reset maxPosts when query (thus results) change.
    useEffect(() => {
        setMaxPosts(DEFAULT_MAX_POSTS);
    }, [results]);

    // Keyboard navigation in the result list.
    useEffect(() => {
        const el = containerRef.current?.ownerDocument;
        if (!el) return undefined;

        const handler = (e: Event): void => {
            const ke = e as globalThis.KeyboardEvent;
            const currentIdx = allItems.findIndex(item => item.id === selectedId);
            if (ke.key === 'ArrowUp' && currentIdx > 0) {
                setSelectedId(allItems[currentIdx - 1]?.id ?? null);
            } else if (ke.key === 'ArrowDown' && currentIdx < allItems.length - 1) {
                setSelectedId(allItems[currentIdx + 1]?.id ?? null);
            } else if (ke.key === 'Enter') {
                const selected = allItems[currentIdx];
                if (selected?.url) {
                    window.location.href = selected.url;
                }
            }
        };

        el.addEventListener('keyup', handler);
        return () => el.removeEventListener('keyup', handler);
    }, [allItems, selectedId]);

    if (allItems.length === 0) return null;

    const visiblePosts = results.posts.slice(0, maxPosts + 1);
    const hasMore = results.posts.length > maxPosts;

    return (
        <div
            className="gh:overflow-y-auto gh:max-h-[min(70vh,calc(100vh-172px))]"
            ref={containerRef}
            role="listbox"
        >
            <ResultsSection
                label={t('Authors')}
                items={results.authors}
                renderItem={(author, i) => (
                    <AuthorListItem
                        key={`author-${i}`}
                        author={author}
                        isSelected={selectedId === author.id}
                        onSelect={() => setSelectedId(author.id)}
                    />
                )}
            />
            <ResultsSection
                label={t('Tags')}
                items={results.tags}
                renderItem={(tag, i) => (
                    <TagListItem
                        key={`tag-${i}`}
                        tag={tag}
                        isSelected={selectedId === tag.id}
                        onSelect={() => setSelectedId(tag.id)}
                    />
                )}
            />
            <ResultsSection
                label={t('Posts')}
                items={visiblePosts}
                renderItem={(post, i) => (
                    <PostListItem
                        key={`post-${i}`}
                        post={post}
                        query={query}
                        isSelected={selectedId === post.id}
                        onSelect={() => setSelectedId(post.id)}
                    />
                )}
            />
            {hasMore ? (
                <button
                    type="button"
                    className="gh:block gh:mx-4 gh:sm:mx-7 gh:my-3 gh:p-3 gh:w-[calc(100%-2rem)] gh:sm:w-[calc(100%-3.5rem)] gh:border gh:border-[#ebeef0] gh:hover:border-[#d6dbe0] gh:rounded-md gh:bg-white gh:hover:bg-[#f5f6f7] gh:cursor-pointer gh:font-semibold gh:text-[14px] gh:text-[#15171a] gh:transition-colors"
                    onClick={() => setMaxPosts(p => p + STEP_MAX_POSTS)}
                >
                    {t('Show more results')}
                </button>
            ) : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Search input box
// ---------------------------------------------------------------------------

interface SearchBoxProps {
    query: string;
    onQueryChange(q: string): void;
    onClose(): void;
    isLoading: boolean;
    t: Services['t'];
    inputRef: React.RefObject<HTMLInputElement | null>;
}

function SearchBox({query, onQueryChange, onClose, isLoading, t, inputRef}: SearchBoxProps): ReactElement {
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        // Suppress default scroll for arrow keys to allow result list navigation.
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
        }
    };

    const handleKeyUp = useCallback((e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    return (
        <div className="gh:flex gh:items-center gh:gap-3 gh:bg-white gh:px-4 gh:sm:px-7 gh:py-5">
            {query ? (
                <button
                    type="button"
                    className="gh:flex gh:items-center gh:justify-center gh:w-7 gh:h-7 gh:p-0 gh:border-0 gh:bg-transparent gh:cursor-pointer gh:text-[#15171a] gh:hover:text-[#5b6573] gh:flex-none"
                    aria-label={t('Clear search')}
                    onClick={() => onQueryChange('')}
                >
                    <CloseIcon className="gh:w-4 gh:h-4" />
                </button>
            ) : (
                <div className="gh:flex gh:items-center gh:justify-center gh:w-7 gh:h-7 gh:flex-none gh:text-[#15171a]">
                    <SearchIcon />
                </div>
            )}
            <input
                ref={inputRef}
                type="search"
                className="gh-search-input gh:flex-1 gh:border-0 gh:p-0 gh:bg-transparent gh:text-[16.5px] gh:text-[#15171a] gh:outline-none gh:min-w-0 gh:placeholder:text-[#95a1ae]"
                value={query}
                placeholder={t('Search posts, tags and authors')}
                aria-label={t('Search')}
                autoComplete="off"
                onChange={e => onQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
            />
            {isLoading && query ? <SpinnerIcon /> : null}
            <button
                type="button"
                className="gh:hidden gh:max-sm:block gh:p-0 gh:border-0 gh:bg-transparent gh:cursor-pointer gh:text-[14px] gh:text-[#5b6573] gh:whitespace-nowrap gh:flex-none"
                onClick={onClose}
            >
                {t('Cancel')}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal root
// ---------------------------------------------------------------------------

export function SearchModal({services, onClose}: Props): ReactElement {
    const {site} = services.getState();
    const {t} = services;

    // Direction derived from the locale (RTL languages).
    const dir = services.dir();

    // search-index lives on admin URL with a frontend Content API key.
    const apiUrl = site.admin_url ?? site.url;
    const apiKey = site.search_api_key ?? '';
    const {indexState, results, query, setQuery} = useSearch(apiUrl, apiKey, dir);

    const inputRef = useRef<HTMLInputElement | null>(null);

    // Auto-focus the input when the modal mounts.
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    const hasResults = results && (
        results.posts.length > 0 ||
        results.authors.length > 0 ||
        results.tags.length > 0
    );

    const showNoResults = indexState === 'ready' && query && !hasResults;

    return (
        <div role="dialog" aria-modal="true" aria-label={t('Search')}>
            <SearchBox
                query={query}
                onQueryChange={setQuery}
                onClose={onClose}
                isLoading={indexState === 'loading'}
                t={t}
                inputRef={inputRef}
            />
            {hasResults ? (
                <AllResults results={results} query={query} t={t} />
            ) : null}
            {showNoResults ? (
                <div className="gh:border-t gh:border-[#ebeef0] gh:py-4 gh:px-4 gh:sm:px-7">
                    <p className="gh:m-0 gh:text-[16.5px] gh:text-[#95a1ae]">{t('No matches found')}</p>
                </div>
            ) : null}
        </div>
    );
}
