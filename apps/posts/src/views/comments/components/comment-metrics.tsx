import CommentLikesModal from './comment-likes-modal';
import CommentReportsModal from './comment-reports-modal';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {Link, useSearchParams} from '@tryghost/admin-x-framework';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
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
    const [likesModalDefaultTab, setLikesModalDefaultTab] = useState<'likes' | 'dislikes'>('likes');
    const [reportsModalOpen, setReportsModalOpen] = useState(false);
    const repliesLink = buildThreadLink(searchParams, comment.id);

    const repliesCount = comment.count?.direct_replies ?? comment.count?.replies ?? comment.replies?.length ?? 0; // TODO: remove replies fallback once backend is fully rolled out
    const likesCount = comment.count?.likes ?? 0;
    const dislikesCount = comment.count?.dislikes ?? 0;
    const netScore = likesCount - dislikesCount;
    const reportsCount = comment.count?.reports ?? 0;
    const hasReplies = repliesCount > 0;
    const hasLikes = likesCount > 0;
    const hasDislikes = dislikesCount > 0;
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
                <div className="flex items-center gap-2 text-xs text-gray-800">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {hasLikes ? (
                                    <button
                                        className="flex cursor-pointer items-center hover:opacity-70"
                                        data-testid="likes-metric"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLikesModalDefaultTab('likes');
                                            setLikesModalOpen(true);
                                        }}
                                    >
                                        <LucideIcon.ThumbsUp size={16} strokeWidth={1.5} />
                                    </button>
                                ) : (
                                    <div className="flex items-center" data-testid="likes-metric">
                                        <LucideIcon.ThumbsUp size={16} strokeWidth={1.5} />
                                    </div>
                                )}
                            </TooltipTrigger>
                            <TooltipContent>{hasLikes ? 'View likes' : 'Likes'}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {hasLikes || hasDislikes ? (
                        <button
                            className="cursor-pointer hover:opacity-70"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLikesModalDefaultTab('likes');
                                setLikesModalOpen(true);
                            }}
                        >
                            <span>{formatNumber(netScore)}</span>
                        </button>
                    ) : (
                        <span>{formatNumber(netScore)}</span>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {hasDislikes ? (
                                    <button
                                        className="flex cursor-pointer items-center hover:opacity-70"
                                        data-testid="dislikes-metric"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLikesModalDefaultTab('dislikes');
                                            setLikesModalOpen(true);
                                        }}
                                    >
                                        <LucideIcon.ThumbsDown size={16} strokeWidth={1.5} />
                                    </button>
                                ) : (
                                    <div className="flex items-center" data-testid="dislikes-metric">
                                        <LucideIcon.ThumbsDown size={16} strokeWidth={1.5} />
                                    </div>
                                )}
                            </TooltipTrigger>
                            <TooltipContent>{hasDislikes ? 'View dislikes' : 'Dislikes'}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
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
                defaultTab={likesModalDefaultTab}
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
