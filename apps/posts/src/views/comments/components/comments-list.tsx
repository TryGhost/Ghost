import CommentContent from './comment-content';
import CommentThreadSidebar from './comment-thread-sidebar';
import {Button, LucideIcon} from '@tryghost/shade';
import {Comment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {CommentAvatar} from './comment-avatar';
import {CommentHeader} from './comment-header';
import {CommentMenu} from './comment-menu';
import {CommentMetrics} from './comment-metrics';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';
import {forwardRef, useEffect, useRef, useState} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';

const SpacerRow = ({height}: { height: number }) => (
    <div aria-hidden="true" className="flex">
        <div className="flex" style={{height}} />
    </div>
);

// TODO: Remove forwardRef once we have upgraded to React 19
const PlaceholderRow = forwardRef<HTMLDivElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <div
            ref={ref}
            {...props}
            aria-hidden="true"
            className="relative flex flex-col"
        >
            <div className="relative z-10 h-24 animate-pulse">
                <div className="h-full rounded-md bg-muted" data-testid="loading-placeholder" />
            </div>
        </div>
    );
});

function CommentsList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onAddFilter,
    isLoading,
    commentPermalinksEnabled
}: {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    onAddFilter: (field: string, value: string, operator?: string) => void;
    isLoading?: boolean;
    commentPermalinksEnabled?: boolean;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [threadSidebarOpen, setThreadSidebarOpen] = useState(false);
    const [selectedThreadCommentId, setSelectedThreadCommentId] = useState<string | null>(null);

    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();

    const handleOpenThread = (commentId: string) => {
        // Update URL to open thread sidebar
        const newParams = new URLSearchParams(searchParams);
        newParams.set('thread', `is:${commentId}`);
        setSearchParams(newParams, {replace: false});
    };

    const handleThreadClick = (commentId: string) => {
        // Update URL to show the clicked thread
        const newParams = new URLSearchParams(searchParams);
        newParams.set('thread', `is:${commentId}`);
        // Remove reply_to when navigating to a new thread
        newParams.delete('reply_to');
        setSearchParams(newParams, {replace: false});
    };

    const handleCloseSidebar = (open: boolean) => {
        setThreadSidebarOpen(open);
        if (!open) {
            // Remove thread and reply_to params from URL when sidebar closes
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('thread');
            newParams.delete('reply_to');
            setSearchParams(newParams, {replace: true});
        }
    };

    // Check for thread query parameter and open sidebar
    useEffect(() => {
        const threadParam = searchParams.get('thread');
        if (threadParam) {
            // Parse format: "is:comment-id"
            const match = threadParam.match(/^is:(.+)$/);
            if (match && match[1]) {
                const threadId = match[1];
                setSelectedThreadCommentId(threadId);
                setThreadSidebarOpen(true);
            } else {
                // No valid thread param, close sidebar
                setThreadSidebarOpen(false);
                setSelectedThreadCommentId(null);
            }
        } else {
            // No thread param, close sidebar
            setThreadSidebarOpen(false);
            setSelectedThreadCommentId(null);
        }
    }, [searchParams]);

    // Restore scroll position when navigating back from filtered views
    useScrollRestoration({parentRef, isLoading});

    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        parentRef
    });

    return (
        <div ref={parentRef} className="overflow-hidden">
            <div
                className="flex flex-col"
                data-testid="comments-list"
            >
                <div className="flex flex-col">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder =
                            virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        const hasReplies = (item.count?.replies ?? 0) > 0;

                        return (
                            <div
                                key={key}
                                {...props}
                                className="grid w-full grid-cols-1 items-start justify-between gap-4 border-b p-3 hover:bg-muted/50 md:p-5 lg:grid-cols-[minmax(0,1fr)_144px]"
                                data-testid="comment-list-row"
                                onClick={() => {
                                    // Close sidebar when clicking on a comment in the main list
                                    if (threadSidebarOpen) {
                                        handleCloseSidebar(false);
                                    }
                                }}
                            >
                                <div className='flex items-start gap-3'>
                                    <CommentAvatar
                                        avatarImage={item.member?.avatar_image}
                                        isHidden={item.status === 'hidden'}
                                        memberId={item.member?.id}
                                    />

                                    <div className='flex min-w-0 flex-col'>
                                        <CommentHeader
                                            canComment={item.member?.can_comment}
                                            createdAt={item.created_at}
                                            isHidden={item.status === 'hidden'}
                                            memberId={item.member?.id}
                                            memberName={item.member?.name}
                                            postTitle={item.post?.title}
                                            onAuthorClick={item.member?.id ? () => onAddFilter('author', item.member!.id) : undefined}
                                            onPostClick={item.post?.id ? () => onAddFilter('post', item.post!.id) : undefined}
                                        />

                                        {item.in_reply_to_snippet && (
                                            <div className={`mb-1 line-clamp-1 text-sm ${item.status === 'hidden' && 'opacity-50'}`}>
                                                <span className="text-muted-foreground">Replied to:</span>&nbsp;
                                                <Link
                                                    className="text-sm font-normal text-muted-foreground hover:text-foreground"
                                                    to={(() => {
                                                        // Preserve existing query params and add/update thread params
                                                        const newParams = new URLSearchParams(searchParams);
                                                        newParams.set('thread', `is:${item.parent_id}`);
                                                        if (item.in_reply_to_id) {
                                                            newParams.set('reply_to', `is:${item.in_reply_to_id}`);
                                                        }
                                                        return `?${newParams.toString()}`;
                                                    })()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    {item.in_reply_to_snippet}
                                                </Link>
                                            </div>
                                        )}

                                        <CommentContent item={item} />

                                        <div className="mt-4 flex flex-row flex-nowrap items-center gap-3">
                                            {item.status === 'published' && (
                                                <Button className='text-foreground' size="sm" variant="outline" onClick={() => hideComment({id: item.id})}>
                                                    <LucideIcon.EyeOff/>
                                                    Hide
                                                </Button>
                                            )}
                                            {item.status === 'hidden' && (
                                                <Button className='text-foreground' size="sm" variant="outline" onClick={() => showComment({id: item.id})}>
                                                    <LucideIcon.Eye/>
                                                    Show
                                                </Button>
                                            )}
                                            <CommentMetrics
                                                className="ml-2"
                                                hasReplies={hasReplies}
                                                likesCount={item.count?.likes}
                                                repliesCount={item.count?.replies}
                                                reportsCount={item.count?.reports}
                                                onRepliesClick={() => handleOpenThread(item.id)}
                                            />
                                            <CommentMenu
                                                comment={item}
                                                commentPermalinksEnabled={commentPermalinksEnabled}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {item.post?.feature_image ? (
                                        <img
                                            alt={item.post.title || 'Post feature image'}
                                            className={`hidden aspect-video w-36 rounded object-cover lg:block ${item.status === 'hidden' && 'opacity-50'}`}
                                            src={item.post.feature_image}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </div>
            </div>

            <CommentThreadSidebar
                commentId={selectedThreadCommentId}
                commentPermalinksEnabled={commentPermalinksEnabled}
                open={threadSidebarOpen}
                onOpenChange={handleCloseSidebar}
                onThreadClick={handleThreadClick}
            />
        </div>
    );
}

export default CommentsList;
