import CommentLikesModal from './comment-likes-modal';
import CommentReportsModal from './comment-reports-modal';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {
    LucideIcon,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    cn,
    formatNumber
} from '@tryghost/shade';
import {useState} from 'react';

interface MetricProps {
    icon: React.ReactNode;
    count: number;
    label: string;
    onClick?: () => void;
    className?: string;
}

function Metric({icon, count, label, onClick, className}: MetricProps) {
    const baseClassName = cn('flex items-center gap-1 text-xs text-gray-800', className);
    const content = (
        <>
            {icon}
            <span>{formatNumber(count)}</span>
        </>
    );

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {onClick ? (
                        <button
                            className={cn(baseClassName, 'cursor-pointer hover:opacity-70')}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            {content}
                        </button>
                    ) : (
                        <div className={baseClassName}>
                            {content}
                        </div>
                    )}
                </TooltipTrigger>
                <TooltipContent>{onClick ? `View ${label.toLowerCase()}` : label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface CommentMetricsProps {
    comment: Comment;
    onRepliesClick: () => void;
    className?: string;
}

export function CommentMetrics({
    comment,
    onRepliesClick,
    className
}: CommentMetricsProps) {
    const [likesModalOpen, setLikesModalOpen] = useState(false);
    const [reportsModalOpen, setReportsModalOpen] = useState(false);

    const repliesCount = comment.count?.replies ?? comment.replies?.length ?? 0;
    const likesCount = comment.count?.likes ?? 0;
    const reportsCount = comment.count?.reports ?? 0;
    const hasReplies = repliesCount > 0;
    const hasLikes = likesCount > 0;
    const hasReports = reportsCount > 0;

    return (
        <>
            <div className={cn('flex items-center gap-6', className)}>
                <Metric
                    count={repliesCount}
                    icon={<LucideIcon.Reply size={16} strokeWidth={1.5} />}
                    label="Replies"
                    onClick={hasReplies ? onRepliesClick : undefined}
                />
                <Metric
                    count={likesCount}
                    icon={<LucideIcon.Heart size={16} strokeWidth={1.5} />}
                    label="Likes"
                    onClick={hasLikes ? () => setLikesModalOpen(true) : undefined}
                />
                <Metric
                    className={hasReports ? 'font-semibold text-red' : undefined}
                    count={reportsCount}
                    icon={<LucideIcon.Flag size={16} strokeWidth={1.5} />}
                    label="Reports"
                    onClick={hasReports ? () => setReportsModalOpen(true) : undefined}
                />
            </div>
            <CommentLikesModal
                comment={comment}
                open={likesModalOpen}
                onOpenChange={setLikesModalOpen}
            />
            <CommentReportsModal
                comment={comment}
                open={reportsModalOpen}
                onOpenChange={setReportsModalOpen}
            />
        </>
    );
}
