import {Component, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AppContext from '../AppContext';
import Frame from './Frame';
import {SearchIcon, ClearIcon, CircleAnimated} from './icons';

const DEFAULT_MAX_POSTS = 10;
const STEP_MAX_POSTS = 10;

const StylesWrapper = () => ({
    modalContainer: {
        zIndex: '3999999',
        position: 'fixed' as const,
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    },
    frame: {
        common: {
            margin: 'auto',
            position: 'relative' as const,
            padding: '0',
            outline: '0',
            width: '100%',
            opacity: '1',
            overflow: 'hidden',
            height: '100%'
        }
    }
});

// SearchBox Component
function SearchBox() {
    const {searchValue, dispatch, inputRef, t} = useContext(AppContext);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => {
            inputRef?.current?.focus();
        }, 150);

        const keyUpHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                dispatch('update', {showPopup: false});
            }
        };

        const containerNode = containerRef?.current;
        containerNode?.ownerDocument.removeEventListener('keyup', keyUpHandler);
        containerNode?.ownerDocument.addEventListener('keyup', keyUpHandler);

        return () => {
            containerNode?.ownerDocument.removeEventListener('keyup', keyUpHandler);
        };
    }, [dispatch, inputRef]);

    let className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 bg-white rounded-t-lg shadow';
    if (!searchValue) {
        className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 bg-white rounded-lg';
    }

    return (
        <div className={className} ref={containerRef}>
            <div className="flex items-center justify-center w-4 h-4 me-3">
                <SearchClearIcon />
            </div>
            <input
                ref={inputRef}
                value={searchValue || ''}
                onChange={(e) => dispatch('update', {searchValue: e.target.value})}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                    }
                }}
                className="grow -my-5 py-5 -ms-3 ps-3 text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400 outline-none truncate"
                placeholder={t('Search posts, tags and authors')}
            />
            <Loading />
            <CancelButton />
        </div>
    );
}

function SearchClearIcon() {
    const {searchValue = '', dispatch} = useContext(AppContext);
    if (!searchValue) {
        return <SearchIcon className="text-neutral-900" />;
    }
    return (
        <button
            className="-mb-[1px]"
            onClick={() => dispatch('update', {searchValue: ''})}
        >
            <ClearIcon className="text-neutral-900 hover:text-neutral-500 h-[1.1rem] w-[1.1rem]" />
        </button>
    );
}

function Loading() {
    const {indexComplete, searchValue} = useContext(AppContext);
    if (!indexComplete && searchValue) {
        return <CircleAnimated className="shrink-0" />;
    }
    return null;
}

function CancelButton() {
    const {dispatch, t} = useContext(AppContext);
    return (
        <button
            className="ms-3 text-sm text-neutral-500 sm:hidden"
            onClick={() => dispatch('update', {showPopup: false})}
        >
            {t('Cancel')}
        </button>
    );
}

// Result Item Components
interface TagListItemProps {
    tag: {id: string; name: string; url: string};
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function TagListItem({tag, selectedResult, setSelectedResult}: TagListItemProps) {
    const {name, url, id} = tag;
    let className = 'flex items-center py-3 -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer';
    if (id === selectedResult) {
        className += ' bg-neutral-100';
    }
    return (
        <div
            className={className}
            onClick={() => url && (window.location.href = url)}
            onMouseEnter={() => setSelectedResult(id)}
        >
            <p className="me-2 text-sm font-bold text-neutral-400">#</p>
            <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">{name}</h2>
        </div>
    );
}

interface TagResultsProps {
    tags: Array<{id: string; name: string; url: string}>;
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function TagResults({tags, selectedResult, setSelectedResult}: TagResultsProps) {
    const {t} = useContext(AppContext);
    if (!tags?.length) return null;

    return (
        <div className="border-t border-gray-200 py-3 px-4 sm:px-7">
            <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">{t('Tags')}</h1>
            {tags.map((tag) => (
                <TagListItem
                    key={tag.name}
                    tag={tag}
                    selectedResult={selectedResult}
                    setSelectedResult={setSelectedResult}
                />
            ))}
        </div>
    );
}

// Highlighting utilities
function getMatchIndexes({text, highlight}: {text: string; highlight: string}) {
    let highlightRegexText = '';
    highlight?.split(' ').forEach((d, idx) => {
        const e = String(d).replace(/\W/g, '\\$&');
        if (idx > 0) {
            highlightRegexText += `|^${e}|\\s${e}`;
        } else {
            highlightRegexText = `^${e}|\\s${e}`;
        }
    });
    const matchRegex = new RegExp(`${highlightRegexText}`, 'ig');
    const matches = text?.matchAll(matchRegex);
    const indexes: Array<{startIdx: number; endIdx: number}> = [];
    for (const match of matches) {
        indexes.push({
            startIdx: match?.index || 0,
            endIdx: (match?.index || 0) + (match?.[0]?.length || 0)
        });
    }
    return indexes;
}

function getHighlightParts({text, highlight}: {text: string; highlight: string}) {
    const highlightIndexes = getMatchIndexes({text, highlight});
    const parts: Array<{text: string; type: 'highlight' | 'normal'}> = [];
    let lastIdx = 0;

    highlightIndexes.forEach((highlightIdx) => {
        if (lastIdx === highlightIdx.startIdx) {
            parts.push({text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx), type: 'highlight'});
            lastIdx = highlightIdx.endIdx;
        } else {
            parts.push({text: text?.slice(lastIdx, highlightIdx.startIdx), type: 'normal'});
            parts.push({text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx), type: 'highlight'});
            lastIdx = highlightIdx.endIdx;
        }
    });
    if (lastIdx < text?.length) {
        parts.push({text: text?.slice(lastIdx, text.length), type: 'normal'});
    }
    return {parts, highlightIndexes};
}

function HighlightedSection({text = '', highlight = '', isExcerpt}: {text: string; highlight: string; isExcerpt: boolean}) {
    let {parts, highlightIndexes} = getHighlightParts({text, highlight});
    if (isExcerpt && highlightIndexes?.[0]) {
        const startIdx = highlightIndexes[0].startIdx;
        if (startIdx > 50) {
            text = '...' + text?.slice(startIdx - 20);
            const updated = getHighlightParts({text, highlight});
            parts = updated.parts;
        }
    }

    return (
        <>
            {parts.map((d, idx) => (
                d.type === 'highlight'
                    ? <span key={idx} className={isExcerpt ? 'font-bold' : 'font-bold text-neutral-900'}>{d.text}</span>
                    : <span key={idx}>{d.text}</span>
            ))}
        </>
    );
}

// Post Components
interface PostListItemProps {
    post: {id: string; title: string; excerpt: string; url: string};
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function PostListItem({post, selectedResult, setSelectedResult}: PostListItemProps) {
    const {searchValue} = useContext(AppContext);
    const {title, excerpt, url, id} = post;
    let className = 'py-3 -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer';
    if (id === selectedResult) {
        className += ' bg-neutral-100';
    }
    return (
        <div
            className={className}
            onClick={() => url && (window.location.href = url)}
            onMouseEnter={() => setSelectedResult(id)}
        >
            <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-800">
                <HighlightedSection text={title} highlight={searchValue} isExcerpt={false} />
            </h2>
            <p className="text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate">
                <HighlightedSection text={excerpt} highlight={searchValue} isExcerpt={true} />
            </p>
        </div>
    );
}

interface PostResultsProps {
    posts: Array<{id: string; title: string; excerpt: string; url: string}>;
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function PostResults({posts, selectedResult, setSelectedResult}: PostResultsProps) {
    const {t} = useContext(AppContext);
    const [maxPosts, setMaxPosts] = useState(DEFAULT_MAX_POSTS);
    const [paginatedPosts, setPaginatedPosts] = useState<typeof posts>([]);

    useEffect(() => setMaxPosts(DEFAULT_MAX_POSTS), [posts]);
    useEffect(() => setPaginatedPosts(posts?.slice(0, maxPosts + 1)), [maxPosts, posts]);

    if (!posts?.length) return null;

    return (
        <div className="border-t border-neutral-200 py-3 px-4 sm:px-7">
            <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">{t('Posts')}</h1>
            {paginatedPosts.map((post) => (
                <PostListItem
                    key={post.title}
                    post={post}
                    selectedResult={selectedResult}
                    setSelectedResult={setSelectedResult}
                />
            ))}
            {posts.length > maxPosts && (
                <button
                    className="w-full my-3 p-[1rem] border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-black font-semibold rounded transition duration-150 ease hover:ease"
                    onClick={() => setMaxPosts(maxPosts + STEP_MAX_POSTS)}
                >
                    {t('Show more results')}
                </button>
            )}
        </div>
    );
}

// Author Components
function AuthorAvatar({name, avatar}: {name: string; avatar?: string}) {
    if (avatar?.length) {
        return <img className="rounded-full bg-neutral-300 w-7 h-7 me-2 object-cover" src={avatar} alt={name} />;
    }
    return (
        <div className="rounded-full bg-neutral-200 w-7 h-7 me-2 flex items-center justify-center font-bold">
            <span className="text-neutral-400">{name.charAt(0)}</span>
        </div>
    );
}

interface AuthorListItemProps {
    author: {id: string; name: string; profile_image?: string; url: string};
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function AuthorListItem({author, selectedResult, setSelectedResult}: AuthorListItemProps) {
    const {name, profile_image: profileImage, url, id} = author;
    let className = 'py-[1rem] -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer flex items-center';
    if (id === selectedResult) {
        className += ' bg-neutral-100';
    }
    return (
        <div
            className={className}
            onClick={() => url && (window.location.href = url)}
            onMouseEnter={() => setSelectedResult(id)}
        >
            <AuthorAvatar name={name} avatar={profileImage} />
            <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">{name}</h2>
        </div>
    );
}

interface AuthorResultsProps {
    authors: Array<{id: string; name: string; profile_image?: string; url: string}>;
    selectedResult: string | null;
    setSelectedResult: (id: string) => void;
}

function AuthorResults({authors, selectedResult, setSelectedResult}: AuthorResultsProps) {
    const {t} = useContext(AppContext);
    if (!authors?.length) return null;

    return (
        <div className="border-t border-neutral-200 py-3 px-4 sm:px-7">
            <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">{t('Authors')}</h1>
            {authors.map((author) => (
                <AuthorListItem
                    key={author.name}
                    author={author}
                    selectedResult={selectedResult}
                    setSelectedResult={setSelectedResult}
                />
            ))}
        </div>
    );
}

// Results Container
interface ResultsProps {
    posts: Array<{id: string; title: string; excerpt: string; url: string}>;
    authors: Array<{id: string; name: string; profile_image?: string; url: string}>;
    tags: Array<{id: string; name: string; url: string}>;
}

function Results({posts, authors, tags}: ResultsProps) {
    const {searchValue} = useContext(AppContext);
    const containerRef = useRef<HTMLDivElement>(null);

    const allResults = useMemo(() => [...authors, ...tags, ...posts], [authors, tags, posts]);
    const defaultId = allResults?.[0]?.id || null;
    const [selectedResult, setSelectedResult] = useState<string | null>(defaultId);

    useEffect(() => setSelectedResult(allResults?.[0]?.id || null), [allResults]);

    useEffect(() => {
        const keyUpHandler = (event: KeyboardEvent) => {
            const selectedResultIdx = allResults.findIndex((d) => d.id === selectedResult);
            const nextResult = allResults[selectedResultIdx + 1];
            const prevResult = allResults[selectedResultIdx - 1];

            if (event.key === 'ArrowUp' && prevResult) {
                setSelectedResult(prevResult.id);
            } else if (event.key === 'ArrowDown' && nextResult) {
                setSelectedResult(nextResult.id);
            }

            if (event.key === 'Enter') {
                const selectedResultData = allResults.find((d) => d.id === selectedResult);
                if (selectedResultData && 'url' in selectedResultData) {
                    window.location.href = selectedResultData.url;
                }
            }
        };

        const containerNode = containerRef?.current;
        containerNode?.ownerDocument.removeEventListener('keyup', keyUpHandler);
        containerNode?.ownerDocument.addEventListener('keyup', keyUpHandler);

        return () => containerNode?.ownerDocument?.removeEventListener('keyup', keyUpHandler);
    }, [allResults, selectedResult]);

    if (!searchValue) return null;

    return (
        <div className="overflow-y-auto max-h-[calc(100vh-172px)] sm:max-h-[70vh] -mt-[1px]" ref={containerRef}>
            <AuthorResults authors={authors} selectedResult={selectedResult} setSelectedResult={setSelectedResult} />
            <TagResults tags={tags} selectedResult={selectedResult} setSelectedResult={setSelectedResult} />
            <PostResults posts={posts} selectedResult={selectedResult} setSelectedResult={setSelectedResult} />
        </div>
    );
}

function NoResultsBox() {
    const {t} = useContext(AppContext);
    return (
        <div className="py-4 px-7">
            <p className="text-[1.65rem] text-neutral-400 leading-normal">{t('No matches found')}</p>
        </div>
    );
}

function SearchResultBox() {
    const {searchValue = '', searchIndex, indexComplete} = useContext(AppContext);

    let filteredPosts: ResultsProps['posts'] = [];
    let filteredAuthors: ResultsProps['authors'] = [];
    let filteredTags: ResultsProps['tags'] = [];

    if (indexComplete && searchValue && searchIndex) {
        const searchResults = searchIndex.search(searchValue);
        filteredPosts = searchResults?.posts || [];
        filteredAuthors = searchResults?.authors || [];
        filteredTags = searchResults?.tags || [];
    }

    // Filter out 404 URLs
    const invalidUrlRegex = /\/404\/$/;
    filteredAuthors = filteredAuthors.filter((author) => !(author?.url && invalidUrlRegex.test(author.url)));
    filteredTags = filteredTags.filter((tag) => !(tag?.url && invalidUrlRegex.test(tag.url)));

    const hasResults = filteredPosts?.length || filteredAuthors?.length || filteredTags?.length;

    if (hasResults) {
        return <Results posts={filteredPosts} authors={filteredAuthors} tags={filteredTags} />;
    } else if (searchValue) {
        return <NoResultsBox />;
    }

    return null;
}

function Search() {
    const {dispatch} = useContext(AppContext);
    return (
        <div
            className="h-screen w-screen pt-20 antialiased z-50 relative ghost-display"
            onClick={(e) => {
                e.preventDefault();
                if (e.target === e.currentTarget) {
                    dispatch('update', {showPopup: false});
                }
            }}
        >
            <div className="bg-white w-full max-w-[95vw] sm:max-w-lg rounded-lg shadow-xl m-auto relative translate-z-0 animate-popup">
                <SearchBox />
                <SearchResultBox />
            </div>
        </div>
    );
}

// Main PopupModal Component
export default class PopupModal extends Component {
    static contextType = AppContext;
    declare context: React.ContextType<typeof AppContext>;

    handlePopupClose = (e: React.MouseEvent) => {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.dispatch('update', {showPopup: false});
        }
    };

    renderFrameStyles() {
        const baseStyles = `
            :root {
                --brandcolor: ${this.context.adminUrl || ''}
            }
            .ghost-display {
                display: none;
            }
        `;

        const {inlineStyles} = this.context;
        return (
            <>
                {inlineStyles && <style dangerouslySetInnerHTML={{__html: inlineStyles}} />}
                <style dangerouslySetInnerHTML={{__html: baseStyles}} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </>
        );
    }

    renderFrameContainer() {
        const Styles = StylesWrapper();
        const frameStyle = {...Styles.frame.common};

        return (
            <div style={Styles.modalContainer} className="gh-root-frame">
                <Frame style={frameStyle} title="portal-popup" head={this.renderFrameStyles()} searchdir={this.context.dir}>
                    <div
                        onClick={this.handlePopupClose}
                        className="absolute top-0 bottom-0 left-0 right-0 block backdrop-blur-[2px] animate-fadein z-0 bg-gradient-to-br from-[rgba(0,0,0,0.2)] to-[rgba(0,0,0,0.1)]"
                    />
                    <Search />
                </Frame>
            </div>
        );
    }

    render() {
        const {showPopup} = this.context;
        if (showPopup) {
            return this.renderFrameContainer();
        }
        return null;
    }
}
