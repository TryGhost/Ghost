import GridLayoutIcon from '../../../assets/icons/kg-layout-grid.svg?react';
import ImgPlaceholderIcon from '../../../assets/icons/kg-img-placeholder.svg?react';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import ListLayoutIcon from '../../../assets/icons/kg-layout-list.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {ButtonGroupSetting, DropdownSetting, SettingsPanel, SliderSetting} from '../SettingsPanel';
import {DateTime} from 'luxon';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';

function PostImage({image, layout, columns, isLoading}) {
    return (
        <div className={clsx(
            'relative flex w-full justify-center dark:bg-grey-950',
            !image && 'items-center bg-grey-200',
            isLoading && 'animate-pulse'
        )}>
            {image ? <img alt="" className={clsx(
                'w-full object-cover',
                (layout === 'grid' && (columns === 1 || columns === 2)) ? 'aspect-video' : 'aspect-[3/2]',
                (image === null) && 'invisible'
            )} src={image}/>
                : <div className={clsx(
                    'w-full object-cover',
                    (layout === 'grid' && (columns === 1 || columns === 2)) ? 'aspect-video' : 'aspect-[3/2]',
                    (image === null) && 'invisible'
                )}></div>
            }
            <ImgPlaceholderIcon className={clsx(
                'absolute size-10 shrink-0 text-grey/80 dark:text-grey/50',
                image && 'hidden',
                layout === 'list' && 'md:size-9 lg:size-10 xl:size-12',
                (layout === 'grid' && columns === 1) && 'md:size-12 lg:size-14 xl:size-20',
                (layout === 'grid' && columns === 2) && 'lg:size-12 xl:size-14',
                (layout === 'grid' && columns === 3) && 'xl:size-12',
            )} />
        </div>
    );
}

function PostTitle({title, layout, columns}) {
    return (
        <div className={clsx(
            'text-lg font-bold leading-tight tracking-normal text-black dark:text-grey-100 xs:text-xl sm:text-2xl',
            layout === 'list' && 'md:text-xl lg:text-2xl',
            (layout === 'grid' && columns === 1) && 'lg:text-3xl xl:text-4xl',
            (layout === 'grid' && columns === 2) && 'md:text-xl lg:text-2xl',
            (layout === 'grid' && columns === 3) && 'md:text-xl',
            (layout === 'grid' && columns === 4) && 'md:text-xl xl:text-[1.7rem]',
        )}>
            {title}
        </div>
    );
}

function PostExcerpt({excerpt, layout, columns}) {
    return (
        <div className={clsx(
            'mt-3 line-clamp-2 max-h-[42px] overflow-y-hidden text-md font-normal leading-snug tracking-[-.01em] text-grey-900 dark:text-grey-600',
            layout === 'list' && 'md:line-clamp-3 md:max-h-[66px] md:text-[1.6rem]',
            (layout === 'grid' && columns === 1) && 'md:line-clamp-3 md:max-h-[66px] md:text-[1.6rem] lg:mt-4 lg:line-clamp-3 lg:max-h-[75px] lg:text-lg',
            (layout === 'grid' && columns === 2) && 'lg:mt-4 lg:line-clamp-3 lg:max-h-[66px] lg:text-[1.6rem]'
        )}>
            {excerpt}
        </div>
    );
}

function PostMeta({publishDate, readTime, layout, columns}) {
    return (
        <div className={clsx(
            'mt-3 flex text-[1.25rem] font-medium leading-snug text-grey-600 dark:text-grey-400',
            layout === 'list' && 'mt-3 md:text-[1.3rem]',
            (layout === 'grid' && columns === 1) && 'md:text-[1.3rem] lg:mt-4 lg:text-sm',
            (layout === 'grid' && columns === 2) && 'lg:mt-4 lg:text-[1.3rem]',
        )}>
            {publishDate ?
                (<div>{DateTime.fromISO(publishDate).toFormat('d LLL yyyy')}</div>)
                : (<div>{DateTime.now().toFormat('d LLL yyyy')}</div>)}
            {readTime > 0 && <div>&nbsp;&middot; {readTime} min</div>}
        </div>
    );
}

export function CollectionPost({
    post,
    layout,
    columns,
    isPlaceholder,
    options,
    isLoading
}) {
    // may want options later for changing post display (like hiding feature img)
    const {title, feature_image: image, published_at: publishDate, reading_time: readTime, excerpt} = (post || {});

    return (
        <div className={clsx(
            'not-kg-prose relative w-full bg-transparent font-sans',
            layout === 'list' && 'grid grid-cols-1 gap-y-4 md:grid-cols-3 md:gap-8',
            layout === 'grid' && 'flex flex-col',
            (layout === 'grid' && columns === 1) && 'gap-4 lg:gap-5',
            (layout === 'grid' && columns === 2) && 'gap-4',
            (layout === 'grid' && columns === 3) && 'gap-4 lg:gap-3',
            (layout === 'grid' && columns === 4) && 'gap-4 lg:gap-3'
        )}>
            {(image || isPlaceholder || isLoading) && <PostImage columns={columns} image={image} isLoading={isLoading} layout={layout} />}
            {(isPlaceholder || isLoading) ?
                <div className="col-span-2 flex flex-col items-start justify-start">
                    <div className={clsx(
                        'h-4 w-full rounded-full bg-grey-200',
                        layout === 'list' && 'mt-0 lg:h-5 lg:w-3/4',
                        (layout === 'grid' && columns === 1) && 'mt-1 md:mt-2 md:h-5 lg:mt-3 lg:h-8',
                        (layout === 'grid' && columns === 2) && 'mt-1 lg:mt-2 lg:h-5',
                        (layout === 'grid' && columns === 4) && 'mt-1 xl:mt-0 xl:h-[1.4rem]',
                        isLoading && 'animate-pulse'
                    )}></div>
                    <div className={clsx(
                        'mt-[1rem] h-4  w-1/2 rounded-full bg-grey-200',
                        layout === 'list' && 'lg:mt-3 lg:h-5 lg:w-1/3',
                        (layout === 'grid' && columns === 1) && 'md:mt-3 md:h-5 lg:mt-3 lg:h-8',
                        (layout === 'grid' && columns === 2) && 'lg:mt-3 lg:h-5',
                        (layout === 'grid' && columns === 4) && 'xl:mt-2 xl:h-[1.4rem]',
                        isLoading && 'animate-pulse'
                    )}></div>
                </div>
                : <div className="col-span-2 flex flex-col items-start justify-start">
                    {title && <PostTitle columns={columns} layout={layout} title={title} />}
                    {excerpt && <PostExcerpt columns={columns} excerpt={excerpt} layout={layout} />}
                    <PostMeta columns={columns} layout={layout} publishDate={publishDate} readTime={readTime} />
                </div>
            }
        </div>
    );
}

export function Collection({
    posts,
    postCount,
    layout,
    columns,
    isLoading
}) {
    function ListPosts() {
        let postList = [];
        for (let i = 0; i < postCount; i++) {
            if (posts && posts[i]) {
                postList.push(<CollectionPost key={posts[i].id} columns={columns} layout={layout} post={posts[i]} />);
            } else {
                postList.push(<CollectionPost key={i} columns={columns} isLoading={isLoading} isPlaceholder={true} layout={layout} />);
            }
        }
        return postList;
    }

    return (
        <>
            {ListPosts()}
        </>
    );
}

export function CollectionCard({
    collection,
    collections,
    columns,
    layout,
    postCount,
    posts,
    handleCollectionChange,
    handleColumnChange,
    handleLayoutChange,
    handlePostCountChange,
    isEditing,
    isLoading,
    headerEditor,
    headerEditorInitialState
}) {
    // collections should be passed in as the editor loads via cardConfig
    const collectionOptions = collections?.filter((item) => {
        // always show default collections
        if (item.slug === 'latest' || item.slug === 'featured') {
            return true;
        }
        return item.posts.length > 0;
    })
        .map((item) => {
            return {
                label: item.title,
                name: item.slug
            };
        });

    const layoutOptions = [
        {
            label: 'List',
            name: 'list',
            Icon: ListLayoutIcon,
            dataTestId: 'collection-layout-list'
        },
        {
            label: 'Grid',
            name: 'grid',
            Icon: GridLayoutIcon,
            dataTestId: 'collection-layout-grid'
        }
    ];

    const onCollectionChange = (value) => {
        checkHeaderDefaults(value);
        handleCollectionChange(value);
    };

    // only update the header if the user hasn't changed anything and is using the default collections & headers
    const checkHeaderDefaults = (value) => {
        if (value !== 'latest' && value !== 'featured') {
            return;
        }
        const header = headerEditor.getEditorState().read(() => ($getRoot().getTextContent())).toLowerCase(); // we use block lettering so we can't differentiate between latest and Latest
        if (value === 'latest' && header === 'featured') {
            headerEditor.update(() => {
                const newHeader = $createParagraphNode().append($createTextNode('Latest'));
                const root = $getRoot();
                root.clear();
                root.append(newHeader);
                root.selectEnd();
            });
        }
        if (value === 'featured' && header === 'latest') {
            headerEditor.update(() => {
                const newHeader = $createParagraphNode().append($createTextNode('Featured'));
                const root = $getRoot();
                root.clear();
                root.append(newHeader);
                root.selectEnd();
            });
        }
    };

    return (
        <>
            {(isEditing || !isEditorEmpty(headerEditor)) && (
                <KoenigNestedEditor
                    autoFocus={true}
                    dataTestId={'collection-header'}
                    hasSettingsPanel={true}
                    initialEditor={headerEditor}
                    initialState={headerEditorInitialState}
                    nodes="minimal"
                    placeholderClassName={'text-md uppercase font-sans leading-normal font-bold tracking-[-.01em] text-black dark:text-grey-50 opacity-40'}
                    placeholderText="Collection title"
                    singleParagraph={true}
                    textClassName={'koenig-lexical-section-title whitespace-normal text-black dark:text-grey-50 opacity-100 pt-2 pb-4'}
                />)
            }
            <div className={clsx(
                'grid w-full',
                layout === 'list' && 'gap-8',
                (layout === 'grid' && columns === 1) && 'grid-cols-1 gap-6 md:gap-8 lg:gap-10 xl:gap-y-12',
                (layout === 'grid' && columns === 2) && 'grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:gap-10',
                (layout === 'grid' && columns === 3) && 'grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3',
                (layout === 'grid' && columns === 4) && 'grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6'
            )}
            data-testid='collection-posts-container'
            >
                <Collection columns={columns} isLoading={isLoading} layout={layout} postCount={postCount} posts={posts} />
            </div>
            {isEditing && (
                <SettingsPanel cardWidth={layout}>
                    <DropdownSetting
                        dataTestId='collections-dropdown'
                        label='Collection'
                        menu={collectionOptions}
                        value={collection}
                        onChange={onCollectionChange}
                    />
                    <ButtonGroupSetting
                        buttons={layoutOptions}
                        dataTestId={'collection-layout'}
                        label="Layout"
                        selectedName={layout}
                        onClick={handleLayoutChange}
                    />
                    <SliderSetting
                        dataTestId={'collection-post-count'}
                        defaultValue={3}
                        description={(!isLoading && postCount > posts.length) && `This collection has ${posts.length} posts, and will continue to fill in as you publish more.`}
                        label="Post Count"
                        max={12}
                        min={1}
                        value={postCount}
                        onChange={handlePostCountChange}
                    />
                    {layout === 'grid' ?
                        <SliderSetting
                            dataTestId={'collection-columns'}
                            defaultValue={3}
                            label="Columns"
                            max={4}
                            min={1}
                            value={columns}
                            onChange={handleColumnChange}
                        />
                        : null
                    }
                </SettingsPanel>
            )}
            {!isEditing && <ReadOnlyOverlay />}
        </>
    );
}

CollectionCard.propTypes = {
    collection: PropTypes.string,
    collections: PropTypes.array,
    columns: PropTypes.number,
    layout: PropTypes.oneOf(['list', 'grid']),
    postCount: PropTypes.number,
    posts: PropTypes.array,
    handleCollectionChange: PropTypes.func,
    handleColumnChange: PropTypes.func,
    handleLayoutChange: PropTypes.func,
    handlePostCountChange: PropTypes.func,
    handleRowChange: PropTypes.func,
    isEditing: PropTypes.bool,
    isLoading: PropTypes.bool,
    headerEditor: PropTypes.object,
    headerEditorInitialState: PropTypes.object
};

Collection.propTypes = {
    posts: PropTypes.array,
    layout: PropTypes.oneOf(['list', 'grid']),
    postCount: PropTypes.number,
    columns: PropTypes.number,
    isLoading: PropTypes.bool
};

CollectionPost.propTypes = {
    post: PropTypes.object,
    layout: PropTypes.oneOf(['list', 'grid']),
    options: PropTypes.object,
    columns: PropTypes.number,
    isPlaceholder: PropTypes.bool,
    isLoading: PropTypes.bool
};

PostImage.propTypes = {
    image: PropTypes.string,
    layout: PropTypes.oneOf(['list', 'grid']),
    columns: PropTypes.number,
    isLoading: PropTypes.bool
};

PostTitle.propTypes = {
    title: PropTypes.string,
    layout: PropTypes.oneOf(['list', 'grid']),
    columns: PropTypes.number
};

PostExcerpt.propTypes = {
    excerpt: PropTypes.string,
    layout: PropTypes.oneOf(['list', 'grid']),
    columns: PropTypes.number
};

PostMeta.propTypes = {
    publishDate: PropTypes.string,
    readTime: PropTypes.number,
    layout: PropTypes.oneOf(['list', 'grid']),
    columns: PropTypes.number
};
