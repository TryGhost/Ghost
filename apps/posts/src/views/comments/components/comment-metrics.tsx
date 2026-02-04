import {
    LucideIcon,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    cn,
    formatNumber
} from '@tryghost/shade';

interface CommentMetricsProps {
    repliesCount?: number;
    likesCount?: number;
    reportsCount?: number;
    hasReplies?: boolean;
    onRepliesClick?: () => void;
    className?: string;
}

export function CommentMetrics({
    repliesCount = 0,
    likesCount = 0,
    reportsCount = 0,
    hasReplies,
    onRepliesClick,
    className
}: CommentMetricsProps) {
    const isClickableReplies = hasReplies && onRepliesClick;

    return (
        <div className={cn('flex items-center gap-6', className)}>
            {isClickableReplies ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                className='flex cursor-pointer items-center gap-1 text-xs text-gray-800 hover:opacity-70'
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRepliesClick();
                                }}
                            >
                                <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                <span>{formatNumber(repliesCount)}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>View replies</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='flex items-center gap-1 text-xs text-gray-800'>
                                <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                <span>{formatNumber(repliesCount)}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>Replies</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center gap-1 text-xs text-gray-800'>
                            <LucideIcon.Heart size={16} strokeWidth={1.5} />
                            <span>{formatNumber(likesCount)}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>Likes</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            'flex items-center gap-1 text-xs',
                            reportsCount ? 'font-semibold text-red' : 'text-gray-800'
                        )}>
                            <LucideIcon.Flag size={16} strokeWidth={reportsCount ? 1.75 : 1.5} />
                            <span>{formatNumber(reportsCount)}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>Reports</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
