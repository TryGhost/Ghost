import Frame from './frame';
import { CircleAnimatedIcon, ClearIcon, SearchIcon } from './icons';
import { Fragment } from 'preact';
import { useAppContext } from '../app-context';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
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

type SelectionProps = {
  selectedResult: string | null;
  setSelectedResult: (id: string | null) => void;
};

function SearchBox() {
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
        className="grow -my-5 py-5 -ms-3 ps-3 text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400 outline-none truncate"
        placeholder={t('Search posts, tags and authors')}
        value={searchValue || ''}
        onInput={(e) => {
          setSearchValue(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
        }}
      />
      <Loading />
      <CancelButton />
    </div>
  );
}

function SearchClearIcon() {
  const { searchValue = '', setSearchValue } = useAppContext();
  if (!searchValue) {
    return <SearchIcon className="text-neutral-900" />;
  }
  return (
    <button
      className="-mb-[1px]"
      type="button"
      onClick={() => {
        setSearchValue('');
      }}
    >
      <ClearIcon className="text-neutral-900 hover:text-neutral-500 h-[1.1rem] w-[1.1rem]" />
    </button>
  );
}

function Loading() {
  const { indexComplete, searchValue } = useAppContext();
  if (!indexComplete && searchValue) {
    return <CircleAnimatedIcon className="shrink-0" />;
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
    <div
      className={className}
      onClick={() => {
        if (url) {
          window.location.href = url;
        }
      }}
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <p className="me-2 text-sm font-bold text-neutral-400">#</p>
      <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">{name}</h2>
    </div>
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
    <div className="border-t border-gray-200 py-3 px-4 sm:px-7">
      <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">
        {t('Tags')}
      </h1>
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
  let className = 'py-3 -mx-4 sm:-mx-7 px-4 sm:px-7 cursor-pointer';
  if (id === selectedResult) {
    className += ' bg-neutral-100';
  }
  return (
    <div
      className={className}
      onClick={() => {
        if (url) {
          window.location.href = url;
        }
      }}
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-800">
        <HighlightedSection highlight={searchValue} isExcerpt={false} text={title} />
      </h2>
      <p className="text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate">
        <HighlightedSection highlight={searchValue} isExcerpt={true} text={excerpt} />
      </p>
    </div>
  );
}

type HighlightIndex = { startIdx: number; endIdx: number };
type HighlightPart = { text: string; type: 'highlight' | 'normal' };

function getMatchIndexes({ text, highlight }: { text: string; highlight: string }) {
  let highlightRegexText = '';
  highlight?.split(' ').forEach((d, idx) => {
    // escape regex syntax in search queries
    const e = String(d).replace(/\W/g, '\\&');
    if (idx > 0) {
      highlightRegexText += `|^` + e + `|\\s` + e;
    } else {
      highlightRegexText = `^` + e + `|\\s` + e;
    }
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

function ShowMoreButton({
  posts,
  maxPosts,
  setMaxPosts,
}: {
  posts: SearchPost[];
  maxPosts: number;
  setMaxPosts: (maxPosts: number) => void;
}) {
  const { t } = useAppContext();

  if (!posts?.length || maxPosts >= posts?.length) {
    return null;
  }
  return (
    <button
      className="w-full my-3 p-[1rem] border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-black font-semibold rounded transition duration-150 ease hover:ease"
      type="button"
      onClick={() => {
        const updatedMaxPosts = maxPosts + STEP_MAX_POSTS;
        setMaxPosts(updatedMaxPosts);
      }}
    >
      {t('Show more results')}
    </button>
  );
}

function PostResults({
  posts,
  selectedResult,
  setSelectedResult,
}: { posts: SearchPost[] } & SelectionProps) {
  const { t } = useAppContext();
  const [maxPosts, setMaxPosts] = useState(DEFAULT_MAX_POSTS);
  if (!posts?.length) {
    return null;
  }
  const paginatedPosts = posts.slice(0, maxPosts + 1);
  return (
    <div className="border-t border-neutral-200 py-3 px-4 sm:px-7">
      <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">
        {t('Posts')}
      </h1>
      {paginatedPosts.map((d) => (
        <PostListItem key={d.title} post={d} {...{ selectedResult, setSelectedResult }} />
      ))}
      <ShowMoreButton maxPosts={maxPosts} posts={posts} setMaxPosts={setMaxPosts} />
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
    <div
      className={className}
      onClick={() => {
        if (url) {
          window.location.href = url;
        }
      }}
      onMouseEnter={() => {
        setSelectedResult(id);
      }}
    >
      <AuthorAvatar avatar={profileImage} name={name} />
      <h2 className="text-[1.65rem] font-medium leading-tight text-neutral-900 truncate">{name}</h2>
    </div>
  );
}

function AuthorAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  const Avatar = avatar?.length;
  const Character = name.charAt(0);
  if (Avatar) {
    return (
      <img
        alt={name}
        className="rounded-full bg-neutral-300 w-7 h-7 me-2 object-cover"
        src={avatar}
      />
    );
  }
  return (
    <div className="rounded-full bg-neutral-200 w-7 h-7 me-2 flex items-center justify-center font-bold">
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
    <div className="border-t border-neutral-200 py-3 px-4 sm:px-7">
      <h1 className="uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide">
        {t('Authors')}
      </h1>
      {AuthorItems}
    </div>
  );
}

function SearchResultBox() {
  const { searchValue = '', searchIndex, indexComplete } = useAppContext();

  const { filteredPosts, filteredAuthors, filteredTags } = useMemo(() => {
    const invalidUrlRegex = /\/404\/$/;
    const searchResults = indexComplete && searchValue ? searchIndex?.search(searchValue) : null;
    return {
      filteredPosts: searchResults?.posts || [],
      filteredAuthors: (searchResults?.authors || []).filter((author) => {
        return !(author?.url && invalidUrlRegex.test(author?.url));
      }),
      filteredTags: (searchResults?.tags || []).filter((tag) => {
        return !(tag?.url && invalidUrlRegex.test(tag?.url));
      }),
    };
  }, [searchIndex, searchValue, indexComplete]);

  const hasResults = filteredPosts?.length || filteredAuthors?.length || filteredTags?.length;

  if (hasResults) {
    // Keyed by query so selection and pagination start fresh within the same render
    return (
      <Results
        key={searchValue}
        authors={filteredAuthors}
        posts={filteredPosts}
        tags={filteredTags}
      />
    );
  } else if (searchValue) {
    return <NoResultsBox />;
  }

  return null;
}

export function Results({
  posts,
  authors,
  tags,
}: {
  posts: SearchPost[];
  authors: SearchAuthor[];
  tags: SearchTag[];
}) {
  const { searchValue } = useAppContext();

  const allResults = useMemo(() => {
    return [...authors, ...tags, ...posts];
  }, [authors, tags, posts]);

  const defaultId = allResults?.[0]?.id || null;
  const [selectedResult, setSelectedResult] = useState<string | null>(defaultId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preact runs useEffect after the next frame; rapid keypresses would hit a stale handler
  useLayoutEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      // keyCode 229 is the IME composition key for legacy browsers
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      const selectedResultIdx = allResults.findIndex((d) => {
        return d.id === selectedResult;
      });
      const nextResult = allResults[selectedResultIdx + 1];
      const prevResult = allResults[selectedResultIdx - 1];
      if (event.key === 'ArrowUp' && prevResult) {
        setSelectedResult(prevResult?.id);
      } else if (event.key === 'ArrowDown' && nextResult) {
        setSelectedResult(nextResult?.id);
      }

      if (event.key === 'Enter') {
        const selectedResultData = allResults.find((d) => {
          return d.id === selectedResult;
        });
        if (selectedResultData) {
          window.location.href = selectedResultData.url;
        }
      }
    };

    const containeRefNode = containerRef?.current;
    const doc = containeRefNode?.ownerDocument;
    doc?.removeEventListener('keydown', keyDownHandler);
    doc?.addEventListener('keydown', keyDownHandler);

    return () => {
      doc?.removeEventListener('keydown', keyDownHandler);
    };
  }, [allResults, selectedResult]);

  if (!searchValue) {
    return null;
  }
  return (
    <div
      ref={containerRef}
      className="overflow-y-auto max-h-[calc(100vh-172px)] sm:max-h-[70vh] -mt-[1px]"
    >
      <AuthorResults
        authors={authors}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
      />
      <TagResults
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
        tags={tags}
      />
      <PostResults
        posts={posts}
        selectedResult={selectedResult}
        setSelectedResult={setSelectedResult}
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

function Search() {
  const { closePopup } = useAppContext();
  return (
    <>
      <div
        className="h-screen w-screen pt-20 antialiased z-50 relative ghost-display"
        onClick={(e) => {
          e.preventDefault();
          if (e.target === e.currentTarget) {
            closePopup();
          }
        }}
      >
        <div className="bg-white w-full max-w-[95vw] sm:max-w-lg rounded-lg shadow-xl m-auto relative translate-z-0 animate-popup">
          <SearchBox />
          <SearchResultBox />
        </div>
      </div>
    </>
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
  const { closePopup, dir, stylesUrl } = useAppContext();

  return (
    <div className="gh-root-frame" style={MODAL_CONTAINER_STYLE}>
      <Frame
        dir={dir}
        head={<FrameHead stylesUrl={stylesUrl} />}
        style={FRAME_STYLE}
        title="portal-popup"
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
