import Frame from './Frame';
import AppContext from '../AppContext';
import {ReactComponent as SearchIcon} from '../icons/search.svg';
import {ReactComponent as CloseIcon} from '../icons/close.svg';
import {useContext} from 'react';
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
        // Handle Esc to close popup
        if (this.node) {
            this.node.focus();
            this.keyUphandler = (event) => {
                const eventTargetTag = (event.target && event.target.tagName);
                if (event.key === 'Escape' && eventTargetTag !== 'INPUT') {
                    // this.context.onAction('closePopup');
                }
            };
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
            this.node.ownerDocument.addEventListener('keyup', this.keyUphandler);
        }
        this.sendContainerHeightChangeEvent();
    }

    sendContainerHeightChangeEvent() {

    }

    componentDidUpdate() {
        this.sendContainerHeightChangeEvent();
    }

    componentWillUnmount() {
        if (this.node) {
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
        }
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
    return (
        <div className='flex items-center py-5 px-7 mt-10 md:mt-0'>
            <SearchIcon className='mr-3 text-neutral-900' alt='Search' />
            <input
                value={searchValue || ''}
                onChange={(e) => {
                    dispatch('update', {
                        searchValue: e.target.value
                    });
                }}
                className='grow text-[1.65rem] focus-visible:outline-none placeholder:text-gray-400'
                placeholder='Search posts, tags, authors..'
            />
            <ClearButton />
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

function TagListItem({title}) {
    return (
        <div className='flex items-center py-3 -mx-7 px-7 hover:bg-gray-100 cursor-pointer'>
            <p className='mr-2 text-sm font-bold text-neutral-400'>#</p>
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900'>{title}</h2>
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
                key={d.title}
                title={d.title}
            />
        );
    });
    return (
        <div className='border-t border-gray-200 py-3 px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Tags</h1>
            {TagItems}
        </div>
    );
}

function PostListItem({title, excerpt, slug}) {
    const {siteUrl} = useContext(AppContext);
    return (
        <div className='py-3 -mx-7 px-7 hover:bg-neutral-100 cursor-pointer' onClick={() => {
            if (slug) {
                window.location.href = `${siteUrl}${slug}`;
            }
        }}>
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900'>{title}</h2>
            <p className='text-neutral-400 leading-normal text-sm mt-0 mb-0 truncate'>{excerpt}</p>
        </div>
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
                title={d.title}
                excerpt={d.excerpt}
                slug={d.slug}
            />
        );
    });
    return (
        <div className='border-t border-neutral-200 py-3 px-7'>
            <h1 className='uppercase text-xs text-neutral-400 font-semibold mb-1 tracking-wide'>Posts</h1>
            {PostItems}
        </div>
    );
}

function AuthorListItem({name, avatar}) {
    return (
        <div className='py-3 -mx-7 px-7 hover:bg-neutral-100 cursor-pointer flex items-center'>
            <AuthorAvatar name={name} avatar={avatar} />
            <h2 className='text-[1.65rem] font-medium leading-tight text-neutral-900'>{name}</h2>
        </div>
    );
}

function AuthorAvatar({name, avatar}) {
    const Avatar = avatar?.length;
    if (Avatar) {
        return (
            <img className='rounded-full bg-neutral-300 w-6 h-6 mr-2' src={avatar} alt={name}/>
        );
    }
    return (
        <img className='rounded-full bg-neutral-300 w-6 h-6 mr-2' src='https://thumbs.dreamstime.com/b/omita-al-avatar-placeholder-de-la-foto-icono-del-perfil-124557887.jpg' alt={name}/>
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
                name={d.name}
                avatar={d.avatar}
            />
        );
    });

    return (
        <div className='border-t border-neutral-200 py-3 px-7'>
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
        filteredPosts = searchResults?.posts?.map((d) => {
            return {
                id: d?.id,
                excerpt: d?.excerpt,
                title: d?.title,
                slug: d?.slug
            };
        }) || [];
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
        <div className='overflow-scroll max-h-[70vh]'>
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
                className='bg-[rgba(0,0,0,0.2)] h-screen w-screen pt-20 antialiased z-50 relative ghost-display'
                onClick={(e) => {
                    e.preventDefault();
                    if (e.target === e.currentTarget) {
                        dispatch('update', {
                            showPopup: false
                        });
                    }
                }}
            >
                <div className='bg-white max-w-lg rounded-t-2xl md:rounded-lg shadow-xl m-auto absolute md:relative top-20 md:top-0 bottom-0 left-0 right-0'>
                    <CloseIcon className='ml-3 text-neutral-300 cursor-pointer w-5 h-5  right-6 top-6 md:hidden' alt='Close' />
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
                        className='absolute top-0 bottom-0 left-0 right-0 block backdrop-blur-[2px] z-0 bg-gradient-to-br from-[rgba(0,0,0,0.2)] to-[rgba(0,0,0,0.1)]' />
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
