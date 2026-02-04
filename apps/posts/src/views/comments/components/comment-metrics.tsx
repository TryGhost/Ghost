import {
    Button,
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
        <div className={cn('flex items-center gap-1', className)}>
            {isClickableReplies ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                className='text-foreground/60 [&_svg]:size-4'
                                size='sm'
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRepliesClick();
                                }}
                            >
                                <LucideIcon.Reply size={16} strokeWidth={1.5} />
                                <span>{formatNumber(repliesCount)}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>View replies</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='inline-flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium text-foreground/60'>
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
                        <div className='inline-flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium text-foreground/60'>
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
                            'inline-flex h-7 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium text-foreground/60',
                            reportsCount ? 'font-semibold text-red' : 'text-foreground/60'
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
