import CommentLikesModal from './comment-likes-modal';
import CommentReportsModal from './comment-reports-modal';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';
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
    to?: string;
    onClick?: () => void;
    className?: string;
    testId?: string;
}

function Metric({icon, count, label, to, onClick, className, testId}: MetricProps) {
    const baseClassName = cn('flex items-center gap-1 text-xs text-gray-800', className);
    const content = (
        <>
            {icon}
            <span>{formatNumber(count)}</span>
        </>
    );

    const isClickable = to || onClick;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {to ? (
                        <Link
                            className={cn(baseClassName, 'cursor-pointer hover:opacity-70')}
                            data-testid={testId}
                            to={to}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                            }}
                        >
                            {content}
                        </Link>
                    ) : onClick ? (
                        <button
                            className={cn(baseClassName, 'cursor-pointer hover:opacity-70')}
                            data-testid={testId}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            {content}
                        </button>
                    ) : (
                        <div className={baseClassName} data-testid={testId}>
                            {content}
                        </div>
                    )}
                </TooltipTrigger>
                <TooltipContent>{isClickable ? `View ${label.toLowerCase()}` : label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Builds a thread link URL that preserves existing search params
 */
export function buildThreadLink(searchParams: URLSearchParams, commentId: string | undefined | null): string | undefined {
    if (!commentId) {
        return undefined;
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.set('thread', `is:${commentId}`);
    return `?${newParams.toString()}`;
}

interface CommentMetricsProps {
    comment: Comment;
    className?: string;
}

export function CommentMetrics({
    comment,
    className
}: CommentMetricsProps) {
    const [searchParams] = useSearchParams();
    const [likesModalOpen, setLikesModalOpen] = useState(false);
    const [reportsModalOpen, setReportsModalOpen] = useState(false);
    const repliesLink = buildThreadLink(searchParams, comment.id);

    const repliesCount = comment.count?.direct_replies ?? comment.count?.replies ?? comment.replies?.length ?? 0; // TODO: remove replies fallback once backend is fully rolled out
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
                    testId="replies-metric"
                    to={hasReplies ? repliesLink : undefined}
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
