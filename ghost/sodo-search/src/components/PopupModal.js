import Frame from './Frame';
import AppContext from '../AppContext';
import {ReactComponent as SearchIcon} from '../icons/search.svg';
import {ReactComponent as CloseIcon} from '../icons/close.svg';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {getBundledCssLink} from '../utils/helpers';

const React = require('react');

const tagsData = [
    {
        title: 'Nomad life'
    },
    {
        title: 'Technology'
    }
];

const postsData = [
    {
        title: 'How to ergonomically optimize your <span class=\'font-bold\'>work</span>space',
        excerpt: 'Organically grow the holistic world view of disruptive innovation via workplace diversity and empowerment.'
    },
    {
        title: 'The economical advantage of <span class=\'font-bold\'>work</span>',
        excerpt: 'New data show the end of pandemic coincided with a 49 percent increase in the number of families struggling to survive.'
    },
    {
        title: 'When tech brands get illustration right',
        excerpt: 'Leverage agile <span class=\'font-bold\'>work</span> to provide a robust synopsis for high level overviews.'
    }
];

const authorsData = [
    {
        name: 'Norman Foster'
    },
    {
        name: 'John O\'Nolan',
        avatar: 'https://pbs.twimg.com/profile_images/1064595509472456704/XyL-qE64_400x400.jpg'

    },
    {
        name: 'Ann Jensen'
    }
];

const DEFAULT_MAX_POSTS = 10;
const STEP_MAX_POSTS = 10;

const StylesWrapper = () => {
    return {
        modalContainer: {
            zIndex: '3999999',
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        },
        frame: {
            common: {
                margin: 'auto',
                position: 'relative',
                padding: '0',
                outline: '0',
                width: '100%',
                opacity: '1',
                overflow: 'hidden',
                height: '100%'
            }
        },
        page: {
            links: {
                width: '600px'
            }
        }
    };
};

class PopupContent extends React.Component {
    static contextType = AppContext;

    componentDidMount() {
        this.sendContainerHeightChangeEvent();
    }

    sendContainerHeightChangeEvent() {

    }

    componentDidUpdate() {
        this.sendContainerHeightChangeEvent();
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.dispatch('update', {
                showPopup: false
            });
        }
    }

    render() {
        return (
            <Search />
        );
    }
}

function SearchBox() {
    const {searchValue, dispatch} = useContext(AppContext);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    useEffect(() => {
        setTimeout(() => {
            inputRef?.current?.focus();
        }, 150);

        let keyUphandler = (event) => {
            if (event.key === 'Escape') {
                dispatch('update', {
                    showPopup: false
                });
            }
        };
        const containeRefNode = containerRef?.current;
        containeRefNode?.ownerDocument.removeEventListener('keyup', keyUphandler);
        containeRefNode?.ownerDocument.addEventListener('keyup', keyUphandler);
        return () => {
            containeRefNode?.ownerDocument.removeEventListener('keyup', keyUphandler);
        };
    }, [dispatch]);

    let className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 mt-10 sm:mt-0 bg-white rounded-t-lg shadow';
    if (!searchValue) {
        className = 'z-10 relative flex items-center py-5 px-4 sm:px-7 mt-10 sm:mt-0 bg-white rounded-lg';
    }

    return (
        <div className={className} ref={containerRef}>
            <SearchIcon className='mr-3 text-neutral-900' alt='Search' />
            <input
                ref={inputRef}
                value={searchValue || ''}
                onChange={(e) => {
                    dispatch('update', {
                        searchValue: e.target.value
                    });
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                    }
                }}
                className='grow -my-5 py-5 -ml-3 pl-3 text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400 outline-none'
                placeholder='Search posts, tags, authors..'
            />
            <ClearButton />
            <CloseIcon className='ml-4 text-neutral-300 cursor-pointer w-5 h-5 sm:hidden' alt='Close' />
        </div>
    );
}

function ClearButton() {
    const {searchValue = '', dispatch} = useContext(AppContext);
    if (!searchValue) {
        return null;
    }
    return (
        <button
            className='ml-3 text-sm text-neutral-500 underline' alt='Clear'
            onClick={() => {
                dispatch('update', {
                    searchValue: ''
                });
            }}
        >
            Clear
        </button>
    );
}

function TagListItem({tag, selectedResult, setSelectedResult}) {
    const {name, url, id} = tag;
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
            <p className='mr-2 text-sm font-bold text-neutral-400'>#</p>
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900 truncate'>{name}</h2>
        </div>
    );
}

function TagResults({tags, selectedResult, setSelectedResult}) {
    if (!tags?.length) {
        return null;
    }

    const TagItems = tags.map((d) => {
        return (
            <TagListItem
                key={d.name}
                tag={d}
                {...{selectedResult, setSelectedResult}}
            />
        );
    });
    return (
        <div className='border-t border-gray-200 py-3 px-4 sm:px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Tags</h1>
            {TagItems}
        </div>
    );
}

function PostListItem({post, selectedResult, setSelectedResult}) {
    const {searchValue} = useContext(AppContext);
    const {title, excerpt, url, id} = post;
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
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900'>
                <HighlightedSection text={title} highlight={searchValue} />
            </h2>
            <p className='text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate'>
                <HighlightedSection text={excerpt} highlight={searchValue} />
            </p>
        </div>
    );
}

function HighlightedSection({text, highlight}) {
    const highlightStartIndex = text.toLowerCase().indexOf(highlight.toLowerCase());
    let parts = [];
    if (highlightStartIndex === 0) {
        parts.push({
            text: text?.slice(0, highlight?.length),
            type: 'highlight'
        });
        let nextSection = text?.slice(highlight?.length, text?.length);
        if (nextSection) {
            parts.push({
                text: nextSection,
                type: 'normal'
            });
        }
    } else if (highlightStartIndex > 0) {
        parts.push({
            text: text?.slice(0, highlightStartIndex),
            type: 'normal'
        });
        let highlightSection = text?.slice(highlightStartIndex, highlightStartIndex + highlight?.length);
        if (highlightSection) {
            parts.push({
                text: highlightSection,
                type: 'highlight'
            });
        }
        if (highlightStartIndex + highlight?.length < text.length) {
            let nextSection = text?.slice(highlightStartIndex + highlight?.length);
            parts.push({
                text: nextSection,
                type: 'normal'
            });
        }
    } else {
        parts.push({
            text: text,
            type: 'normal'
        });
    }
    const wordMap = parts.map((d, idx) => {
        if (d?.type === 'highlight') {
            return (
                <React.Fragment key={idx}>
                    <HighlightWord word={d.text} highlight={highlight} />
                </React.Fragment>
            );
        } else {
            return (
                <React.Fragment key={idx}>
                    {d.text}
                </React.Fragment>
            );
        }
    });
    return (
        <>
            {wordMap}
        </>
    );
}

function HighlightWord({word, highlight}) {
    const firstHalf = word.slice(0, (highlight?.length || 0)) || '';
    const secondHalf = word.slice((highlight?.length || 0), (word?.length || 1000)) || '';
    return (
        <>
            <span className='font-bold'>{firstHalf}</span>{secondHalf}
        </>
    );
}

function ShowMoreButton({posts, maxPosts, setMaxPosts}) {
    if (!posts?.length || maxPosts >= posts?.length) {
        return null;
    }
    return (
        <button
            className='w-full my-3 p-[1rem] border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-black font-semibold rounded transition duration-150 ease hover:ease'
            onClick={() => {
                const updatedMaxPosts = maxPosts + STEP_MAX_POSTS;
                setMaxPosts(updatedMaxPosts);
            }}
        >
            Show more results
        </button>
    );
}

function PostResults({posts, selectedResult, setSelectedResult}) {
    const [maxPosts, setMaxPosts] = useState(DEFAULT_MAX_POSTS);
    useEffect(() => {
        setMaxPosts(DEFAULT_MAX_POSTS);
    }, [posts]);

    if (!posts?.length) {
        return null;
    }
    const paginatedPosts = posts?.slice(0, maxPosts);
    const PostItems = paginatedPosts.map((d) => {
        return (
            <PostListItem
                key={d.title}
                post={d}
                {...{selectedResult, setSelectedResult}}
            />
        );
    });
    return (
        <div className='border-t border-neutral-200 py-3 px-4 sm:px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Posts</h1>
            {PostItems}
            <ShowMoreButton setMaxPosts={setMaxPosts} maxPosts={maxPosts} posts={posts} />
        </div>
    );
}

function AuthorListItem({author, selectedResult, setSelectedResult}) {
    const {name, profile_image: profileImage, url, id} = author;
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
            <AuthorAvatar name={name} avatar={profileImage} />
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900 truncate'>{name}</h2>
        </div>
    );
}

function AuthorAvatar({name, avatar}) {
    const Avatar = avatar?.length;
    const Character = name.charAt(0);
    if (Avatar) {
        return (
            <img className='rounded-full bg-neutral-300 w-7 h-7 mr-2 object-cover' src={avatar} alt={name}/>
        );
    }
    return (
        <div className='rounded-full bg-neutral-200 w-7 h-7 mr-2 flex items-center justify-center font-bold'><span className="text-neutral-400">{Character}</span></div>
    );
}

function AuthorResults({authors, selectedResult, setSelectedResult}) {
    if (!authors?.length) {
        return null;
    }

    const AuthorItems = authors.map((d) => {
        return (
            <AuthorListItem
                key={d.name}
                author={d}
                {...{selectedResult, setSelectedResult}}
            />
        );
    });

    return (
        <div className='border-t border-neutral-200 py-3 px-4 sm:px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Authors</h1>
            {AuthorItems}
        </div>
    );
}

function SearchResultBox() {
    const {searchValue = '', searchIndex, indexComplete} = useContext(AppContext);
    let searchResults = null;
    let filteredTags = tagsData.filter((d) => {
        return d.title?.toLowerCase().includes(searchValue?.toLowerCase());
    });

    let filteredPosts = postsData.filter((d) => {
        return d.title?.toLowerCase().includes(searchValue.toLowerCase()) || d.excerpt?.toLowerCase().includes(searchValue?.toLowerCase());
    });

    let filteredAuthors = authorsData.filter((d) => {
        return d.name?.toLowerCase().includes(searchValue?.toLowerCase());
    });

    if (indexComplete && searchValue) {
        searchResults = searchIndex.search(searchValue);
        filteredPosts = searchResults?.posts || [];
        filteredAuthors = searchResults?.authors || [];
        filteredTags = searchResults?.tags || [];
    }

    const hasResults = filteredPosts?.length || filteredAuthors?.length || filteredTags?.length;

    if (hasResults) {
        return (
            <Results posts={filteredPosts} authors={filteredAuthors} tags={filteredTags} />
        );
    }

    return (
        <NoResultsBox />
    );
}

function Results({posts, authors, tags}) {
    const {searchValue} = useContext(AppContext);

    const allResults = useMemo(() => {
        return [
            ...authors,
            ...tags,
            ...posts
        ];
    }, [authors, tags, posts]);

    const defaultId = allResults?.[0]?.id || null;
    const [selectedResult, setSelectedResult] = useState(defaultId);
    const containerRef = useRef(null);

    useEffect(() => {
        setSelectedResult(allResults?.[0]?.id || null);
    }, [allResults]);

    useEffect(() => {
        let keyUphandler = (event) => {
            const selectedResultIdx = allResults.findIndex((d) => {
                return d.id === selectedResult;
            });
            let nextResult = allResults[selectedResultIdx + 1];
            let prevResult = allResults[selectedResultIdx - 1];
            if (event.key === 'ArrowUp' && prevResult) {
                setSelectedResult(prevResult?.id);
            } else if (event.key === 'ArrowDown' && nextResult) {
                setSelectedResult(nextResult?.id);
            }

            if (event.key === 'Enter') {
                const selectedResultData = allResults.find((d) => {
                    return d.id === selectedResult;
                });
                window.location.href = selectedResultData?.url;
            }
        };

        const containeRefNode = containerRef?.current;
        containeRefNode?.ownerDocument.removeEventListener('keyup', keyUphandler);
        containeRefNode?.ownerDocument.addEventListener('keyup', keyUphandler);

        return () => {
            containeRefNode?.ownerDocument?.removeEventListener('keyup', keyUphandler);
        };
    }, [allResults, selectedResult]);

    if (!searchValue) {
        return null;
    }
    return (
        <div className='overflow-y-auto max-h-[calc(100vh-212px)] sm:max-h-[70vh] -mt-[1px]' ref={containerRef}>
            <AuthorResults
                authors={authors}
                selectedResult={selectedResult}
                setSelectedResult={setSelectedResult}
            />
            <TagResults
                tags={tags}
                selectedResult={selectedResult}
                setSelectedResult={setSelectedResult}
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
    return (
        <div className='py-4 px-7'>
            <p className='text-[1.65rem] text-neutral-400 leading-normal'>No matches found...</p>
        </div>
    );
}

function Search() {
    const {dispatch} = useContext(AppContext);
    return (
        <>
            <div
                className='h-screen w-screen pt-20 antialiased z-50 relative ghost-display'
                onClick={(e) => {
                    e.preventDefault();
                    if (e.target === e.currentTarget) {
                        dispatch('update', {
                            showPopup: false
                        });
                    }
                }}
            >
                <div className='bg-white w-full max-w-[95vw] sm:max-w-lg rounded-lg shadow-xl m-auto relative animate-popup'>
                    <SearchBox />
                    <SearchResultBox />
                </div>
            </div>
        </>
    );
}

export default class PopupModal extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            height: null
        };
    }

    onHeightChange(height) {
        this.setState({height});
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.dispatch('update', {
                showPopup: false
            });
        }
    }

    renderFrameStyles() {
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor || ''}
            }

            .ghost-display {
                display: none;
            }
        `;

        const cssLink = getBundledCssLink({appVersion: this.context.appVersion});
        return (
            <>
                <link rel='stylesheet' href={cssLink} />
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1' />
            </>
        );
    }

    renderFrameContainer() {
        const Styles = StylesWrapper();

        const frameStyle = {
            ...Styles.frame.common
        };

        return (
            <div style={Styles.modalContainer} className='gh-root-frame'>
                <Frame style={frameStyle} title='portal-popup' head={this.renderFrameStyles()}>
                    <div
                        onClick = {e => this.handlePopupClose(e)}
                        className='absolute top-0 bottom-0 left-0 right-0 block backdrop-blur-[2px] animate-fadein z-0 bg-gradient-to-br from-[rgba(0,0,0,0.2)] to-[rgba(0,0,0,0.1)]' />
                    <PopupContent />
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
