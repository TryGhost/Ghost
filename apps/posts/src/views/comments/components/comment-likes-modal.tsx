import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, LoadingIndicator, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {Comment, useBrowseCommentDislikes, useBrowseCommentLikes} from '@tryghost/admin-x-framework/api/comments';
import {CommentAvatar} from './comment-avatar';
import {LucideIcon, formatTimestamp} from '@tryghost/shade/utils';
import {formatMemberName} from '@tryghost/shade/app';

type DefaultTab = 'likes' | 'dislikes';

interface CommentLikesModalProps {
    comment: Comment;
    open: boolean;
    defaultTab?: DefaultTab;
    onOpenChange: (open: boolean) => void;
}

function CommentLikesModal({comment, open, defaultTab = 'likes', onOpenChange}: CommentLikesModalProps) {
    const {data: likesData, isLoading: likesLoading} = useBrowseCommentLikes(comment.id, {enabled: open});
    const {data: dislikesData, isLoading: dislikesLoading} = useBrowseCommentDislikes(comment.id, {enabled: open});

    const likes = likesData?.comment_likes ?? [];
    const dislikes = dislikesData?.comment_dislikes ?? [];
    const likeCount = comment.count?.likes ?? 0;
    const dislikeCount = comment.count?.dislikes ?? 0;
    const likesRemaining = likeCount - likes.length;
    const dislikesRemaining = dislikeCount - dislikes.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        {likeCount} {likeCount === 1 ? 'like' : 'likes'} and {dislikeCount} {dislikeCount === 1 ? 'dislike' : 'dislikes'}
                    </DialogTitle>
                </DialogHeader>

                {/* Comment context */}
                <div className="overflow-hidden rounded-md border p-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <CommentAvatar
                            avatarImage={comment.member?.avatar_image}
                            className="shrink-0"
                            memberId={comment.member?.id}
                        />
                        <div className="flex min-w-0 flex-col overflow-hidden">
                            <div className="flex min-w-0 items-center gap-1 text-sm">
                                <span className="shrink-0 font-semibold">
                                    {comment.member ? formatMemberName(comment.member) : 'Deleted member'}
                                </span>
                                <LucideIcon.Dot className="shrink-0 text-muted-foreground/50" size={16} />
                                <span className="shrink-0 text-muted-foreground">
                                    {comment.created_at && formatTimestamp(comment.created_at)}
                                </span>
                                <span className="shrink-0 text-muted-foreground">on</span>
                                <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-400">
                                    {comment.post?.title || 'Unknown post'}
                                </span>
                            </div>
                            <div
                                dangerouslySetInnerHTML={{__html: comment.html || ''}}
                                className="prose mt-2 line-clamp-2 text-sm [&_*]:text-sm [&_*]:leading-[1.5em] [&_p]:m-0"
                            />
                        </div>
                    </div>
                </div>

                <Tabs defaultValue={defaultTab} variant="segmented">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="likes">Likes</TabsTrigger>
                        <TabsTrigger value="dislikes">Dislikes</TabsTrigger>
                    </TabsList>

                    <TabsContent className="mt-4" value="likes">
                        <div className="-mx-1 max-h-64 overflow-y-auto px-1">
                            {likesLoading ? (
                                <div className="flex justify-center py-4">
                                    <LoadingIndicator size="md" />
                                </div>
                            ) : likes.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    No likes yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 pb-1">
                                    {likes.map(like => (
                                        <div key={like.id} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <CommentAvatar
                                                        avatarImage={like.member?.avatar_image}
                                                        memberId={like.member?.id}
                                                    />
                                                    <div className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-pink-500 text-white">
                                                        <LucideIcon.Heart className="size-2.5" fill="currentColor" />
                                                    </div>
                                                </div>
                                                <span className="font-medium">
                                                    {like.member ? formatMemberName(like.member) : 'Deleted member'}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-sm text-muted-foreground">
                                                {formatTimestamp(like.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                    {likesRemaining > 0 && (
                                        <div className="pt-1 text-center text-sm text-muted-foreground">
                                            and {likesRemaining} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent className="mt-4" value="dislikes">
                        <div className="-mx-1 max-h-64 overflow-y-auto px-1">
                            {dislikesLoading ? (
                                <div className="flex justify-center py-4">
                                    <LoadingIndicator size="md" />
                                </div>
                            ) : dislikes.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    No dislikes yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 pb-1">
                                    {dislikes.map(dislike => (
                                        <div key={dislike.id} className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <CommentAvatar
                                                        avatarImage={dislike.member?.avatar_image}
                                                        memberId={dislike.member?.id}
                                                    />
                                                    <div className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-gray-500 text-white">
                                                        <LucideIcon.ThumbsDown className="size-2.5" fill="currentColor" />
                                                    </div>
                                                </div>
                                                <span className="font-medium">
                                                    {dislike.member ? formatMemberName(dislike.member) : 'Deleted member'}
                                                </span>
                                            </div>
                                            <span className="shrink-0 text-sm text-muted-foreground">
                                                {formatTimestamp(dislike.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                    {dislikesRemaining > 0 && (
                                        <div className="pt-1 text-center text-sm text-muted-foreground">
                                            and {dislikesRemaining} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default CommentLikesModal;
