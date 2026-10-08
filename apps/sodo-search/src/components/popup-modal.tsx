import Frame from './frame';
import { CircleAnimatedIcon, ClearIcon, SearchIcon } from './icons';
import { Fragment } from 'preact';
import { isCJK } from '../search-index';
import { useAppContext } from '../app-context';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { SearchAuthor, SearchPost, SearchTag } from '../search-index';

const DEFAULT_MAX_POSTS = 10;
const STEP_MAX_POSTS = 10;

const MODAL_CONTAINER_STYLE: JSX.CSSProperties = {
  zIndex: '3999999',
  position: 'fixed',
  left: '0',
  top: '0',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const FRAME_STYLE: JSX.CSSProperties = {
  margin: 'auto',
  position: 'relative',
  padding: '0',
  outline: '0',
  width: '100%',
  opacity: '1',
  overflow: 'hidden',
  height: '100%',
};

const FRAME_STYLES = `
    :root {
        --brandcolor:
    }

    .ghost-display {
        display: none;
    }
`;

const RESULTS_ID = 'sodo-search-results';

function resultElementId(id: string) {
  return `sodo-search-result-${id}`;
}

type SearchResult = SearchAuthor | SearchTag | SearchPost;

type SelectionProps = {
  selectedResult: string | null;
  setSelectedResult: (id: string | null) => void;
};

function useSearchResults() {
  const { searchValue, searchIndex, indexComplete } = useAppContext();

  return useMemo(() => {
    const invalidUrlRegex = /\/404\/$/;
    const searchResults = indexComplete && searchValue ? searchIndex?.search(searchValue) : null;
    const posts = searchResults?.posts || [];
    const authors = (searchResults?.authors || []).filter((author) => {
      return !(author?.url && invalidUrlRegex.test(author?.url));
    });
    const tags = (searchResults?.tags || []).filter((tag) => {
      return !(tag?.url && invalidUrlRegex.test(tag?.url));
    });
    return { posts, authors, tags };
  }, [searchIndex, searchValue, indexComplete]);
}

function SearchBox({
  allResults,
  selectedResult,
  setSelectedResult,
}: { allResults: SearchResult[] } & SelectionProps) {
  const { searchValue, setSearchValue, closePopup, inputRef, t } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTimeout(() => {
      inputRef?.current?.focus();
    }, 150);

    const keyUphandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    };
    const containeRefNode = containerRef?.current;
    containeRefNode?.ownerDocument.removeEventListener('keyup', keyUphandler);
    containeRefNode?.ownerDocument.addEventListener('keyup', keyUphandler);
    return () => {
      containeRefNode?.ownerDocument.removeEventListener('keyup', keyUphandler);
    };
  }, [closePopup, inputRef]);

  let className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 bg-white rounded-t-lg shadow';
  if (!searchValue) {
    className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 bg-white rounded-lg';
  }

  return (
    <div ref={containerRef} className={className}>
      <div className="flex items-center justify-center w-4 h-4 me-3">
        <SearchClearIcon />
      </div>
      <input
        ref={inputRef}
        aria-activedescendant={selectedResult ? resultElementId(selectedResult) : undefined}
        aria-autocomplete="list"
        aria-controls={allResults.length ? RESULTS_ID : undefined}
        aria-expanded={allResults.length > 0}
        aria-label={t('Search posts, tags and authors')}
        className="grow -my-5 py-5 -ms-3 ps-3 text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400 outline-none truncate"
        placeholder={t('Search posts, tags and authors')}
        role="combobox"
        value={searchValue || ''}
        onInput={(e) => {
          setSearchValue(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // keyCode 229 is the IME composition key for legacy browsers
          if (e.isComposing || e.keyCode === 229) {
            return;
          }
          const selectedIdx = allResults.findIndex((d) => d.id === selectedResult);
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = allResults[selectedIdx + (e.key === 'ArrowDown' ? 1 : -1)];
            if (next) {
              setSelectedResult(next.id);
            }
          } else if (e.key === 'Enter' && allResults[selectedIdx]) {
            window.location.href = allResults[selectedIdx].url;
          }
        }}
      />
      <Loading />
      <CancelButton />
    </div>
  );
}

function SearchClearIcon() {
  const { searchValue = '', setSearchValue, t } = useAppContext();
  if (!searchValue) {
    return <SearchIcon aria-hidden="true" className="text-neutral-900" />;
  }
  return (
    <button
      aria-label={t('Clear search')}
      className="-mb-[1px]"
      type="button"
      onClick={() => {
        setSearchValue('');
      }}
    >
      <ClearIcon
        aria-hidden="true"
        className="text-neutral-900 hover:text-neutral-500 h-[1.1rem] w-[1.1rem]"
      />
    </button>
  );
}

function Loading() {
  const { indexComplete, searchValue } = useAppContext();
  if (!indexComplete && searchValue) {
    return <CircleAnimatedIcon aria-hidden="true" className="shrink-0" />;
  }
  return null;
}

function CancelButton() {
  const { closePopup, t } = useAppContext();

  return (
    <button
      className="ms-3 text-sm text-neutral-500 sm:hidden"
      type="button"
      onClick={() => {
        closePopup();
      }}
    >
      {t('Cancel')}
    </button>
  );
}

function TagListItem({
  tag,
  selectedResult,
  setSelectedResult,
}: { tag: SearchTag } & SelectionProps) {
  const { name, url, id } = tag;
  let className = 'flex items-center py-3 -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer';
  if (id === selectedResult) {
    className += ' bg-neutral-100';
  }
  return (
    <a
      aria-selected={id === selectedResult}
      className={className}
      href={url}
      id={resultElementId(id)}
      role="option"
      tabIndex={-1}
      target="_top"
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <p aria-hidden="true" className="me-2 text-sm font-bold text-neutral-400">
        #
      </p>
      <div className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">
        {name}
      </div>
    </a>
  );
}

function TagResults({
  tags,
  selectedResult,
  setSelectedResult,
}: { tags: SearchTag[] } & SelectionProps) {
  const { t } = useAppContext();

  if (!tags?.length) {
    return null;
  }

  const TagItems = tags.map((d) => {
    return <TagListItem key={d.name} tag={d} {...{ selectedResult, setSelectedResult }} />;
  });
  return (
    <div
      aria-labelledby="sodo-search-tags-label"
      className="border-t border-gray-200 py-3 px-4 sm:px-7"
      role="group"
    >
      <div
        className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide"
        id="sodo-search-tags-label"
        role="presentation"
      >
        {t('Tags')}
      </div>
      {TagItems}
    </div>
  );
}

function PostListItem({
  post,
  selectedResult,
  setSelectedResult,
}: { post: SearchPost } & SelectionProps) {
  const { searchValue } = useAppContext();
  const { title, excerpt, url, id } = post;
  let className = 'block py-3 -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer';
  if (id === selectedResult) {
    className += ' bg-neutral-100';
  }
  return (
    <a
      aria-selected={id === selectedResult}
      className={className}
      href={url}
      id={resultElementId(id)}
      role="option"
      tabIndex={-1}
      target="_top"
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <div className="text-[1.65rem] font-medium leading-tight text-neutral-800">
        <HighlightedSection highlight={searchValue} isExcerpt={false} text={title} />
      </div>
      <p className="text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate">
        <HighlightedSection highlight={searchValue} isExcerpt={true} text={excerpt} />
      </p>
    </a>
  );
}

type HighlightIndex = { startIdx: number; endIdx: number };
type HighlightPart = { text: string; type: 'highlight' | 'normal' };

function getMatchIndexes({ text, highlight }: { text: string; highlight: string }) {
  let highlightRegexText = '';
  highlight?.split(' ').forEach((d, idx) => {
    // escape regex syntax in search queries
    const e = String(d).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // CJK text has no spaces between words, so CJK terms match anywhere
    const term = [...d].some((char) => isCJK(char.codePointAt(0)!)) ? e : `^${e}|\\s${e}`;
    highlightRegexText = idx > 0 ? `${highlightRegexText}|${term}` : term;
  });
  const matchRegex = new RegExp(`${highlightRegexText}`, 'ig');
  const matches = text?.matchAll(matchRegex);
  const indexes: HighlightIndex[] = [];
  for (const match of matches) {
    indexes.push({
      startIdx: match?.index,
      endIdx: (match?.index || 0) + (match?.[0].length || 0),
    });
  }
  return indexes;
}

function getHighlightParts({ text, highlight }: { text: string; highlight: string }) {
  const highlightIndexes = getMatchIndexes({ text, highlight });
  const parts: HighlightPart[] = [];
  let lastIdx = 0;

  highlightIndexes.forEach((highlightIdx) => {
    if (lastIdx === highlightIdx.startIdx) {
      parts.push({
        text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx),
        type: 'highlight',
      });
      lastIdx = highlightIdx.endIdx;
    } else {
      parts.push({
        text: text?.slice(lastIdx, highlightIdx.startIdx),
        type: 'normal',
      });
      parts.push({
        text: text?.slice(highlightIdx.startIdx, highlightIdx.endIdx),
        type: 'highlight',
      });
      lastIdx = highlightIdx.endIdx;
    }
  });
  if (lastIdx < text?.length) {
    parts.push({
      text: text?.slice(lastIdx, text.length),
      type: 'normal',
    });
  }
  return {
    parts,
    highlightIndexes,
  };
}

function HighlightedSection({
  text = '',
  highlight = '',
  isExcerpt,
}: {
  text?: string;
  highlight?: string;
  isExcerpt: boolean;
}) {
  text = text || '';
  highlight = highlight || '';
  let { parts, highlightIndexes } = getHighlightParts({ text, highlight });
  if (isExcerpt && highlightIndexes?.[0]) {
    const startIdx = highlightIndexes?.[0]?.startIdx;
    if (startIdx > 50) {
      text = '...' + text?.slice(startIdx - 20);
      const { parts: updatedParts } = getHighlightParts({ text, highlight });
      parts = updatedParts;
    }
  }

  const wordMap = parts.map((d, idx) => (
    // eslint-disable-next-line react/no-array-index-key -- parts are positional slices of one string
    <Fragment key={idx}>
      {d?.type === 'highlight' ? <HighlightWord isExcerpt={isExcerpt} word={d.text} /> : d.text}
    </Fragment>
  ));
  return <>{wordMap}</>;
}

function HighlightWord({ word, isExcerpt }: { word: string; isExcerpt: boolean }) {
  if (isExcerpt) {
    return (
      <>
        <span className="font-bold">{word}</span>
      </>
    );
  }
  return (
    <>
      <span className="font-bold text-neutral-900">{word}</span>
    </>
  );
}

function ShowMoreButton({ onShowMore }: { onShowMore: () => void }) {
  const { t } = useAppContext();

  return (
    <button
      className="w-full my-3 p-[1rem] border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-black font-semibold rounded transition duration-150 ease hover:ease"
      type="button"
      onClick={onShowMore}
    >
      {t('Show more results')}
    </button>
  );
}

function PostResults({
  posts,
  hasMore,
  onShowMore,
  selectedResult,
  setSelectedResult,
}: { posts: SearchPost[]; hasMore: boolean; onShowMore: () => void } & SelectionProps) {
  const { t } = useAppContext();
  if (!posts?.length) {
    return null;
  }
  return (
    <div
      aria-labelledby="sodo-search-posts-label"
      className="border-t border-neutral-200 py-3 px-4 sm:px-7"
      role="group"
    >
      <div
        className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide"
        id="sodo-search-posts-label"
        role="presentation"
      >
        {t('Posts')}
      </div>
      {posts.map((d) => (
        <PostListItem key={d.title} post={d} {...{ selectedResult, setSelectedResult }} />
      ))}
      {hasMore && <ShowMoreButton onShowMore={onShowMore} />}
    </div>
  );
}

function AuthorListItem({
  author,
  selectedResult,
  setSelectedResult,
}: { author: SearchAuthor } & SelectionProps) {
  const { name, profile_image: profileImage, url, id } = author;
  let className = 'py-[1rem] -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer flex items-center';
  if (id === selectedResult) {
    className += ' bg-neutral-100';
  }
  return (
    <a
      aria-selected={id === selectedResult}
      className={className}
      href={url}
      id={resultElementId(id)}
      role="option"
      tabIndex={-1}
      target="_top"
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <AuthorAvatar avatar={profileImage} name={name} />
      <div className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">
        {name}
      </div>
    </a>
  );
}

function AuthorAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const Avatar = avatar?.length;
  const Character = name.charAt(0);
  if (Avatar) {
    return (
      <img alt="" className="rounded-full bg-neutral-300 w-7 h-7 me-2 object-cover" src={avatar} />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="rounded-full bg-neutral-200 w-7 h-7 me-2 flex items-center justify-center font-bold"
    >
      <span className="text-neutral-400">{Character}</span>
    </div>
  );
}

function AuthorResults({
  authors,
  selectedResult,
  setSelectedResult,
}: { authors: SearchAuthor[] } & SelectionProps) {
  const { t } = useAppContext();

  if (!authors?.length) {
    return null;
  }

  const AuthorItems = authors.map((d) => {
    return <AuthorListItem key={d.name} author={d} {...{ selectedResult, setSelectedResult }} />;
  });

  return (
    <div
      aria-labelledby="sodo-search-authors-label"
      className="border-t border-neutral-200 py-3 px-4 sm:px-7"
      role="group"
    >
      <div
        className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide"
        id="sodo-search-authors-label"
        role="presentation"
      >
        {t('Authors')}
      </div>
      {AuthorItems}
    </div>
  );
}

type ResultsView = {
  authors: SearchAuthor[];
  tags: SearchTag[];
  posts: SearchPost[];
  hasMorePosts: boolean;
  showMorePosts: () => void;
};

function Results({
  view,
  selectedResult,
  setSelectedResult,
}: { view: ResultsView } & SelectionProps) {
  const { t } = useAppContext();

  return (
    <div
      aria-label={t('Search results')}
      className="overflow-y-auto max-h-[calc(100vh-172px)] sm:max-h-[70vh] -mt-[1px]"
      id={RESULTS_ID}
      role="listbox"
    >
      <AuthorResults
        authors={view.authors}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
      />
      <TagResults
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
        tags={view.tags}
      />
      <PostResults
        hasMore={view.hasMorePosts}
        posts={view.posts}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
        onShowMore={view.showMorePosts}
      />
    </div>
  );
}

function NoResultsBox() {
  const { t } = useAppContext();
  return (
    <div className="py-4 px-7">
      <p className="text-[1.65rem] text-neutral-400 leading-normal">{t('No matches found')}</p>
    </div>
  );
}

function trapFocus(e: JSX.TargetedKeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Tab') {
    return;
  }
  const focusable = [...e.currentTarget.querySelectorAll<HTMLElement>('input, button')].filter(
    (element) => element.getClientRects().length > 0,
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = e.currentTarget.ownerDocument.activeElement;
  if (e.shiftKey ? active === first : active === last) {
    e.preventDefault();
    (e.shiftKey ? last : first)?.focus();
  }
}

export function Search() {
  const { closePopup, searchValue, t } = useAppContext();
  const results = useSearchResults();
  const [state, setState] = useState({
    results,
    selectedId: null as string | null,
    maxPosts: DEFAULT_MAX_POSTS,
  });

  // Selection and pagination belong to one set of results; new results start fresh in the same render
  const current =
    state.results === results ? state : { results, selectedId: null, maxPosts: DEFAULT_MAX_POSTS };
  const posts = results.posts.slice(0, current.maxPosts + 1);
  const visibleResults: SearchResult[] = [...results.authors, ...results.tags, ...posts];
  const selectedResult = visibleResults.some((result) => result.id === current.selectedId)
    ? current.selectedId
    : (visibleResults[0]?.id ?? null);
  const setSelectedResult = (id: string | null) => {
    setState({ ...current, selectedId: id });
  };
  const view: ResultsView = {
    authors: results.authors,
    tags: results.tags,
    posts,
    hasMorePosts: current.maxPosts < results.posts.length,
    showMorePosts: () => {
      setState({ ...current, maxPosts: current.maxPosts + STEP_MAX_POSTS });
    },
  };

  return (
    <div
      className="h-screen w-screen pt-20 antialiased z-50 relative ghost-display"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          closePopup();
        }
      }}
    >
      <div
        aria-label={t('Search posts, tags and authors')}
        aria-modal="true"
        className="bg-white w-full max-w-[95vw] sm:max-w-lg rounded-lg shadow-xl m-auto relative translate-z-0 animate-popup"
        role="dialog"
        onKeyDown={trapFocus}
      >
        <SearchBox
          allResults={visibleResults}
          selectedResult={selectedResult}
          setSelectedResult={setSelectedResult}
        />
        {visibleResults.length > 0 && (
          <Results
            selectedResult={selectedResult}
            setSelectedResult={setSelectedResult}
            view={view}
          />
        )}
        {/* Always rendered, so screen readers announce the message when it appears */}
        <div role="status">{!visibleResults.length && searchValue && <NoResultsBox />}</div>
      </div>
    </div>
  );
}

function FrameHead({ stylesUrl }: { stylesUrl?: string }) {
  return (
    <>
      {stylesUrl && <link href={stylesUrl} rel="stylesheet" />}
      <style dangerouslySetInnerHTML={{ __html: FRAME_STYLES }} />
      <meta content="width=device-width, initial-scale=1, maximum-scale=1" name="viewport" />
    </>
  );
}

export default function PopupModal() {
  const { closePopup, dir, stylesUrl, t } = useAppContext();

  return (
    <div className="gh-root-frame" style={MODAL_CONTAINER_STYLE}>
      <Frame
        dir={dir}
        head={<FrameHead stylesUrl={stylesUrl} />}
        style={FRAME_STYLE}
        title={t('Search posts, tags and authors')}
      >
        <div
          className="absolute top-0 bottom-0 left-0 right-0 block backdrop-blur-[2px] animate-fadein z-0 bg-gradient-to-br from-[rgba(0,0,0,0.2)] to-[rgba(0,0,0,0.1)]"
          onClick={(e) => {
            e.preventDefault();
            if (e.target === e.currentTarget) {
              closePopup();
            }
          }}
        />
        <Search />
      </Frame>
    </div>
  );
}
