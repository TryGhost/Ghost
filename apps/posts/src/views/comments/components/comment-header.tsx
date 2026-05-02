import {Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn, formatTimestamp} from '@tryghost/shade/utils';
import type {MouseEvent} from 'react';

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
    isPinned?: boolean;
    onAuthorClick?: () => void;
    postTitle?: string | null;
    onPostClick?: () => void;
    onUnpinClick?: () => void;
    className?: string;
}

const pinnedBadgeClassName = 'inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-0.5 font-sans text-xs font-medium leading-none text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100';
const pinnedButtonClassName = cn(
    pinnedBadgeClassName,
    'hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/20'
);

export function CommentHeader({
    memberName,
    memberId,
    createdAt,
    isHidden,
    canComment,
    isPinned,
    onAuthorClick,
    postTitle,
    onPostClick,
    onUnpinClick,
    className
}: CommentHeaderProps) {
    const handleUnpinClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onUnpinClick?.();
    };

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
            {isPinned && (
                onUnpinClick ? (
                    <button
                        aria-label="Unpin comment"
                        className={cn('group', pinnedButtonClassName)}
                        type="button"
                        onClick={handleUnpinClick}
                    >
                        <span className="grid size-3 shrink-0">
                            <LucideIcon.Pin className="col-start-1 row-start-1 size-3 group-hover:opacity-0 group-focus-visible:opacity-0" />
                            <LucideIcon.PinOff className="col-start-1 row-start-1 size-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </span>
                        <span className="grid justify-items-start text-left">
                            <span className="col-start-1 row-start-1 group-hover:opacity-0 group-focus-visible:opacity-0">Pinned</span>
                            <span className="col-start-1 row-start-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">Unpin</span>
                        </span>
                    </button>
                ) : (
                    <Badge className={pinnedBadgeClassName} variant='outline'>
                        <LucideIcon.Pin className="size-3" />
                        Pinned
                    </Badge>
                )
            )}
        </div>
    );
}
