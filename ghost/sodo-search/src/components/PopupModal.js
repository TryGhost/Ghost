import Frame from './Frame';
import AppContext from '../AppContext';
import {ReactComponent as SearchIcon} from '../icons/search.svg';
import {ReactComponent as CloseIcon} from '../icons/close.svg';
import {useContext, useEffect, useRef} from 'react';
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
        title: 'How to ergonomically optimize your workspace',
        excerpt: 'Organically grow the holistic world view of disruptive innovation via workplace diversity and empowerment.'
    },
    {
        title: 'The economical advantage of design',
        excerpt: 'New data show the end of pandemic relief coincided with a 49 percent increase in the number of families struggling to survive.'
    },
    {
        title: 'When tech brands get illustration right',
        excerpt: 'Leverage agile frameworks to provide a robust synopsis for high level overviews.'
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

    let className = 'z-10 relative flex items-center py-5 px-4 md:px-7 mt-10 md:mt-0 bg-white rounded-t-lg shadow';
    if (!searchValue) {
        className = 'z-10 relative flex items-center py-5 px-4 md:px-7 mt-10 md:mt-0 bg-white rounded-lg';
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
                className='grow -my-5 py-5 -ml-3 pl-3 text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400'
                placeholder='Search posts, tags, authors..'
            />
            <ClearButton />
            <CloseIcon className='ml-4 text-neutral-300 cursor-pointer w-5 h-5 md:hidden' alt='Close' />
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

function TagListItem({tag}) {
    const {name, url} = tag;
    return (
        <div
            className='flex items-center py-3 -mx-4 md:-mx-7 px-4 md:px-7 hover:bg-gray-100 cursor-pointer'
            onClick={() => {
                if (url) {
                    window.location.href = url;
                }
            }}
        >
            <p className='mr-2 text-sm font-bold text-neutral-400'>#</p>
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900 truncate'>{name}</h2>
        </div>
    );
}

function TagResults({tags}) {
    if (!tags?.length) {
        return null;
    }

    const TagItems = tags.map((d) => {
        return (
            <TagListItem
                key={d.name}
                tag={d}
            />
        );
    });
    return (
        <div className='border-t border-gray-200 py-3 px-4 md:px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Tags</h1>
            {TagItems}
        </div>
    );
}

function PostListItem({post}) {
    const {title, excerpt, url} = post;
    return (
        <div className='py-3 -mx-4 md:-mx-7 px-4 md:px-7 hover:bg-neutral-100 cursor-pointer' onClick={() => {
            if (url) {
                window.location.href = url;
            }
        }}>
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900'>{title}</h2>
            <p className='text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate'>{excerpt}</p>
        </div>
    );
}

function ShowMoreButtom() {
    return (
        <button className='w-full my-3 p-[1rem] border border-neutral-200 hover:border-neutral-300 text-neutral-800 hover:text-black font-semibold rounded transition duration-150 ease hover:ease'>
            Show more results
        </button>
    );
}

function PostResults({posts}) {
    if (!posts?.length) {
        return null;
    }

    const PostItems = posts.map((d) => {
        return (
            <PostListItem
                key={d.title}
                post={d}
            />
        );
    });
    return (
        <div className='border-t border-neutral-200 py-3 px-4 md:px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Posts</h1>
            {PostItems}
            <ShowMoreButtom />
        </div>
    );
}

function AuthorListItem({author}) {
    const {name, profile_image: profileImage, url} = author;
    return (
        <div
            className='py-[1rem] -mx-4 md:-mx-7 px-4 md:px-7 hover:bg-neutral-100 cursor-pointer flex items-center'
            onClick={() => {
                if (url) {
                    window.location.href = url;
                }
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

function AuthorResults({authors}) {
    if (!authors?.length) {
        return null;
    }

    const AuthorItems = authors.map((d) => {
        return (
            <AuthorListItem
                key={d.name}
                author={d}
            />
        );
    });

    return (
        <div className='border-t border-neutral-200 py-3 px-4 md:px-7'>
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
    if (!searchValue) {
        return null;
    }
    return (
        <div className='overflow-y-auto max-h-[70vh] -mt-[1px]'>
            <AuthorResults authors={authors} />
            <TagResults tags={tags} />
            <PostResults posts={posts} />
        </div>
    );
}

function NoResultsBox() {
    return (
        <div className='py-4 px-7 border-t border-neutral-200'>
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
                <div className='bg-white w-full max-w-[95vw] md:max-w-lg rounded-lg shadow-xl m-auto relative animate-popup'>
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
