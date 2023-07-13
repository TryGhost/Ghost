import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {ButtonGroupSetting, DropdownSetting, SettingsPanel, SliderSetting} from '../SettingsPanel';
import {DateTime} from 'luxon';
import {ReactComponent as GridLayoutIcon} from '../../../assets/icons/kg-layout-grid.svg';
import {ReactComponent as ListLayoutIcon} from '../../../assets/icons/kg-layout-list.svg';
import {isEditorEmpty} from '../../../utils/isEditorEmpty';

export function CollectionPost({
    post,
    layout,
    columns,
    options
}) {
    // may want options later for changing post display (like hiding feature img)
    const {title, feature_image: image, published_at: publishDate, reading_time: readTime, excerpt} = post;

    return (
        <div className={clsx(
            'not-kg-prose relative w-full gap-5 bg-transparent font-sans',
            layout === 'list' && 'grid grid-cols-3',
            layout === 'grid' && 'flex flex-col'
        )}>
            {image &&
                (<img alt="" className={clsx(
                    'w-full object-cover',
                    (layout === 'grid' && (columns === 1 || columns === 2)) ? 'aspect-video' : 'aspect-[3/2]'
                )} src={image}/>)
            }
            <div className="col-span-2 flex flex-col items-start justify-start">
                {title && <div className={clsx(
                    'font-bold tracking-normal text-black dark:text-grey-100',
                    columns === 1 && 'w-2/3 text-4xl leading-tight',
                    columns === 2 && 'text-2xl leading-snug',
                    columns === 3 && 'text-xl leading-snug',
                    columns === 4 && 'text-[1.7rem] leading-snug'
                )}>{title}</div>}
                {excerpt && <div className={clsx(
                    'max-h-[44px] overflow-y-hidden font-normal leading-snug text-grey-900 line-clamp-2 dark:text-grey-600',
                    columns === 1 && 'mt-3 w-2/3 text-lg',
                    columns === 2 && 'mt-3 text-[1.6rem]',
                    columns === 3 && 'mt-2 text-md',
                    columns === 4 && 'mt-2 text-md'
                )}>{excerpt}</div>}
                <div className={clsx(
                    'flex font-normal leading-snug text-grey-600 dark:text-grey-400',
                    columns === 1 && 'mt-3 w-2/3 text-lg',
                    columns === 2 && 'mt-3 text-[1.6rem]',
                    columns === 3 && 'mt-2 text-md',
                    columns === 4 && 'mt-2 text-md'
                )}>
                    {publishDate && <div>{DateTime.fromISO(publishDate).toLocaleString()}</div>}
                    {publishDate && readTime > 0 && <div>&nbsp;&middot;&nbsp;</div>}
                    {readTime > 0 && <div>{readTime} min</div>}
                </div>
            </div>
        </div>
    );
}

export function Collection({
    posts,
    postCount,
    layout,
    columns
}) {
    // would apply appropriate container styles here for the respective format
    // also need to figure out how to handle placeholders if we should have a specific # showing
    //  in the editor vs. in the rendered post (handled by the renderer method)
    const ListPosts = posts && posts
        .filter((post, index) => index < postCount)
        .map((post) => {
            return <CollectionPost key={post.id} columns={columns} layout={layout} post={post} />;
        });

    return (
        <>
            {ListPosts}
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
    // TODO: we shouldn't be getting collections without posts from the editor load
    const collectionOptions = collections?.filter(item => item.posts.length > 0)
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
            Icon: ListLayoutIcon
        },
        {
            label: 'Grid',
            name: 'grid',
            Icon: GridLayoutIcon
        }
    ];

    const onCollectionChange = (value) => {
        checkHeaderDefaults(value);
        handleCollectionChange(value);
    };

    // only update the header if the user hasn't changed anything and is using the default collections & headers
    const checkHeaderDefaults = (value) => {
        if (value !== 'index' && value !== 'featured') {
            return;
        }
        const header = headerEditor.getEditorState().read(() => ($getRoot().getTextContent()));
        if (value === 'index' && header === 'Featured') {
            headerEditor.update(() => {
                const newHeader = $createParagraphNode().append($createTextNode('Latest'));
                const root = $getRoot();
                root.clear();
                root.append(newHeader);
                root.selectEnd();
            });
        }
        if (value === 'featured' && header === 'Latest') {
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
                    hasSettingsPanel={true}
                    initialEditor={headerEditor}
                    initialState={headerEditorInitialState}
                    nodes="minimal"
                    placeholderClassName={'!font-sans !text-[2.2rem] !font-bold !leading-snug !tracking-tight text-black dark:text-grey-50 opacity-40'}
                    placeholderText="Collection Header"
                    singleParagraph={true}
                    textClassName={'koenig-lexical-collection-heading whitespace-normal text-black dark:text-grey-50 opacity-100 pt-2 pb-4'}
                />)
            }
            <div className={clsx(
                'grid w-full',
                layout === 'list' && 'gap-5',
                (layout === 'grid' && columns === 1) && 'grid-cols-1 gap-y-14',
                (layout === 'grid' && columns === 2) && 'grid-cols-2 gap-x-10 gap-y-14',
                (layout === 'grid' && columns === 3) && 'grid-cols-3 gap-x-8 gap-y-12',
                (layout === 'grid' && columns === 4) && 'grid-cols-4 gap-x-6 gap-y-10'
            )}>
                <Collection columns={columns} layout={layout} postCount={postCount} posts={posts} />
            </div>
            {isEditing && (
                <SettingsPanel>
                    <DropdownSetting
                        dataTestId='collections-dropdown'
                        label='Collection'
                        menu={collectionOptions}
                        value={collection?.slug}
                        onChange={onCollectionChange}
                    />
                    <ButtonGroupSetting
                        buttons={layoutOptions}
                        label="Layout"
                        selectedName={layout}
                        onClick={handleLayoutChange}
                    />
                    <SliderSetting
                        defaultValue={3}
                        label="Post Count"
                        max={12}
                        min={1}
                        value={postCount}
                        onChange={handlePostCountChange}
                    />
                    {layout === 'grid' ?
                        <SliderSetting
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
        </>
    );
}

CollectionCard.propTypes = {
    collection: PropTypes.object,
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
    columns: PropTypes.number
};

CollectionPost.propTypes = {
    post: PropTypes.object,
    layout: PropTypes.oneOf(['list', 'grid']),
    options: PropTypes.object,
    columns: PropTypes.number
};
