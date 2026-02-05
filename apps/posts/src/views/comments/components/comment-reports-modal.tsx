import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LoadingIndicator,
    LucideIcon,
    formatTimestamp
} from '@tryghost/shade';
import {Comment, useBrowseCommentReports} from '@tryghost/admin-x-framework/api/comments';
import {CommentAvatar} from './comment-avatar';

interface CommentReportsModalProps {
    comment: Comment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function CommentReportsModal({comment, open, onOpenChange}: CommentReportsModalProps) {
    const {data, isLoading} = useBrowseCommentReports(comment.id, {enabled: open});
    const reports = data?.comment_reports ?? [];
    const reportCount = comment.count?.reports ?? reports.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>
                        {reportCount} {reportCount === 1 ? 'report' : 'reports'}
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
                                    {comment.member?.name || 'Unknown'}
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

                {/* Reporters list */}
                <div className="-mx-1 max-h-64 overflow-y-auto px-1">
                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <LoadingIndicator size="md" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 pb-1">
                            {reports.map(report => (
                                <div key={report.id} className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <CommentAvatar
                                                avatarImage={report.member?.avatar_image}
                                                memberId={report.member?.id}
                                            />
                                            {/* Red flag overlay */}
                                            <div className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red text-white">
                                                <LucideIcon.Flag className="size-2.5" fill="currentColor" />
                                            </div>
                                        </div>
                                        <span className="font-medium">
                                            {report.member?.name || 'Deleted member'}
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-sm text-muted-foreground">
                                        {formatTimestamp(report.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default CommentReportsModal;
