import PropTypes from 'prop-types';
import React from 'react';
import clsx from 'clsx';
import {ButtonGroupSetting, DropdownSetting, SettingsPanel, SliderSetting} from '../SettingsPanel';
import {DateTime} from 'luxon';
import {ReactComponent as GridLayoutIcon} from '../../../assets/icons/kg-layout-grid.svg';
import {ReactComponent as ListLayoutIcon} from '../../../assets/icons/kg-layout-list.svg';

export function CollectionPost({
    post,
    layout,
    options
}) {
    // may want options later for changing post display (like hiding feature img)
    const {title, image, publishDate, readTime, excerpt} = post;
    
    return (
        <div className={clsx(
            'not-kg-prose relative flex min-h-[120px] w-full gap-5 bg-transparent font-sans',
            layout === 'grid' && 'flex-col'
        )}>
            {image &&
                (<div className={'grow-1 relative m-0 min-w-[33%]'}>
                    <img alt="" className="h-full max-h-[136px] w-full object-cover" src={image}/>
                </div>)
            }
            <div className="flex grow basis-full flex-col items-start justify-start">
                {title && <div className="text-[1.7rem] font-semibold leading-normal tracking-normal text-grey-900 dark:text-grey-100">{title}</div>}
                {excerpt && <div className="mt-1 max-h-[44px] overflow-y-hidden text-sm font-normal leading-normal text-grey-800 line-clamp-2 dark:text-grey-600">{excerpt}</div>}
                <div className="flex">
                    {publishDate && <div className="mt-1 text-xs font-normal leading-normal text-grey-600 dark:text-grey-400">{DateTime.fromISO(publishDate).toLocaleString()}</div>}
                    {publishDate && readTime && <div className="mt-1 text-xs font-semibold leading-normal text-grey-600 dark:text-grey-400">&nbsp;&middot;&nbsp;</div>}
                    {readTime && <div className="mt-1 text-xs font-normal leading-normal text-grey-600 dark:text-grey-400">{readTime}</div>}
                </div>
            </div>
            <div className="absolute inset-0 z-50 mt-0"></div>
        </div>
    );
}

export function Collection({
    posts,
    columns,
    postCount,
    layout
}) {
    // would apply appropriate container styles here for the respective format
    // also need to figure out how to handle placeholders if we should have a specific # showing
    //  in the editor vs. in the rendered post (handled by the renderer method)
    const ListPosts = posts && posts
        .filter((post, index) => index < postCount)
        .map((post) => {
            return <CollectionPost key={post.id} layout={layout} post={post} />;
        });

    return (
        <>
            {ListPosts}
        </>
    );
}

export function CollectionCard({
    collection,
    columns,
    layout,
    postCount,
    posts,
    handleCollectionChange,
    handleColumnChange,
    handleLayoutChange,
    handlePostCountChange,
    isEditing
}) {
    const collectionOptions = [{
        label: 'Latest',
        name: 123456
    }, {
        label: 'Featured',
        name: 987654
    }];

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

    return (
        <>
            <div className={clsx(
                'w-full gap-4',
                layout === 'list' && 'flex flex-col',
                layout === 'grid' && 'grid grid-cols-3'
            )}>
                <Collection columns={columns} layout={layout} postCount={postCount} posts={posts} />
            </div>
            {isEditing && (
                <SettingsPanel>
                    <DropdownSetting
                        dataTestId='collections-dropdown'
                        label='Collection'
                        menu={collectionOptions}
                        value={collection?.id}
                        onChange={handleCollectionChange}
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

CollectionPost.propTypes = {
    post: PropTypes.object,
    layout: PropTypes.oneOf(['list', 'grid']),
    options: PropTypes.object
};

CollectionCard.propTypes = {
    collection: PropTypes.object,
    columns: PropTypes.number,
    layout: PropTypes.oneOf(['list', 'grid']),
    postCount: PropTypes.number,
    posts: PropTypes.array,
    handleCollectionChange: PropTypes.func,
    handleColumnChange: PropTypes.func,
    handleLayoutChange: PropTypes.func,
    handlePostCountChange: PropTypes.func,
    handleRowChange: PropTypes.func,
    isEditing: PropTypes.bool
};

Collection.propTypes = {
    posts: PropTypes.array,
    columns: PropTypes.number,
    layout: PropTypes.oneOf(['list', 'grid']),
    postCount: PropTypes.number
};