import {
    Badge,
    Button,
    LucideIcon,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    cn,
    formatTimestamp
} from '@tryghost/shade';

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
    return formatted.replace(/(\d+),(\s+\d{4})/, '$1$2');
}

interface CommentHeaderProps {
    memberName?: string | null;
    memberId?: string | null;
    createdAt?: string;
    isHidden?: boolean;
    canComment?: boolean | null;
    onAuthorClick?: () => void;
    postTitle?: string | null;
    onPostClick?: () => void;
    className?: string;
}

export function CommentHeader({
    memberName,
    memberId,
    createdAt,
    isHidden,
    canComment,
    onAuthorClick,
    postTitle,
    onPostClick,
    className
}: CommentHeaderProps) {
    return (
        <div className={cn('flex items-baseline gap-4', className)}>
            <div className={cn(
                'mb-1 flex min-w-0 items-center gap-x-1 text-sm',
                isHidden && 'opacity-50'
            )}>
                <div className='whitespace-nowrap'>
                    {memberId && onAuthorClick ? (
                        <Button
                            className="flex h-auto items-center gap-1.5 truncate p-0 font-semibold text-primary hover:opacity-70"
                            variant='link'
                            onClick={onAuthorClick}
                        >
                            {memberName || 'Unknown'}
                        </Button>
                    ) : (
                        <span className="block truncate font-semibold">
                            {memberName || 'Unknown'}
                        </span>
                    )}
                </div>
                {canComment === false && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span data-testid="commenting-disabled-indicator">
                                    <LucideIcon.MessageCircleOff
                                        className="size-3.5 text-muted-foreground"
                                    />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>Comments disabled</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <LucideIcon.Dot className='shrink-0 text-muted-foreground/50' size={16} />
                <div className='shrink-0 whitespace-nowrap'>
                    {createdAt && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-default text-sm text-muted-foreground">
                                        {formatTimestamp(createdAt)}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {formatDate(createdAt)}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                {postTitle && (
                    <>
                        <div className='shrink-0 text-muted-foreground'>on</div>
                        <div className='min-w-0 truncate'>
                            {onPostClick ? (
                                <Button
                                    className="block h-auto w-full cursor-pointer truncate p-0 text-left font-medium text-gray-800 hover:opacity-70 dark:text-gray-400"
                                    variant='link'
                                    onClick={onPostClick}
                                >
                                    {postTitle}
                                </Button>
                            ) : (
                                <span className="font-medium text-gray-800 dark:text-gray-400">
                                    {postTitle}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
            {isHidden && (
                <Badge variant='secondary'>Hidden</Badge>
            )}
        </div>
    );
}
