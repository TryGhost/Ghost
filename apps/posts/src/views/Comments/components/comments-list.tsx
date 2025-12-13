import {
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Checkbox,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatMemberName,
    getMemberInitials,
    stringToHslColor
} from '@tryghost/shade';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '../../Tags/components/VirtualTable/use-infinite-virtual-scroll';

const SpacerRow = ({height}: { height: number }) => (
    <tr aria-hidden="true" className="flex lg:table-row">
        <td className="flex lg:table-cell" style={{height}} />
    </tr>
);

const PlaceholderRow = forwardRef<HTMLTableRowElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <TableRow
            ref={ref}
            {...props}
            aria-hidden="true"
            className="relative flex flex-col lg:table-row"
        >
            <TableCell className="relative z-10 h-24 animate-pulse" colSpan={6}>
                <div className="h-full rounded-md bg-muted" data-testid="loading-placeholder" />
            </TableCell>
        </TableRow>
    );
});

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
    case 'published':
        return 'default';
    case 'hidden':
        return 'secondary';
    case 'deleted':
        return 'destructive';
    default:
        return 'outline';
    }
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function stripHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}

interface CommentsListProps {
    items: Comment[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    isSelectingAllMatching: boolean;
    onSelectAllMatching: () => void;
    onClearSelection: () => void;
    onFilterByMember: (memberId: string) => void;
    onFilterByComment: (commentId: string) => void;
    onMemberNavigate: (memberId: string) => void;
    onHideComment: (id: string) => void;
    onShowComment: (id: string) => void;
    onDeleteComment: (id: string) => void;
    onBanMember: (memberId: string) => void;
    onUnbanMember: (memberId: string) => void;
}

function CommentsList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    selectedIds,
    onSelectionChange,
    isSelectingAllMatching,
    onSelectAllMatching,
    onClearSelection,
    onFilterByMember,
    onFilterByComment,
    onMemberNavigate,
    onHideComment,
    onShowComment,
    onDeleteComment,
    onBanMember,
    onUnbanMember
}: CommentsListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        parentRef
    });

    const allSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));
    const someSelected = items.some(item => selectedIds.has(item.id));

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        onSelectionChange(newSelected);
    };

    return (
        <div ref={parentRef} className="overflow-hidden">
            <Table
                className="flex table-fixed flex-col lg:table"
                data-testid="comments-list"
            >
                <TableHeader className="hidden lg:!visible lg:!table-header-group">
                    <TableRow>
                        <TableHead className="w-12 px-4">
                            <Checkbox
                                checked={isSelectingAllMatching ? true : someSelected && !allSelected ? 'indeterminate' : allSelected}
                                onCheckedChange={(value) => {
                                    if (value) {
                                        onSelectAllMatching();
                                    } else {
                                        onClearSelection();
                                    }
                                }}
                            />
                        </TableHead>
                        <TableHead className="w-auto px-4">Comment</TableHead>
                        <TableHead className="w-1/6 px-4">Author</TableHead>
                        <TableHead className="w-1/6 px-4">Post</TableHead>
                        <TableHead className="w-24 px-4">Status</TableHead>
                        <TableHead className="w-28 px-4">Date</TableHead>
                        <TableHead className="w-16 px-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="flex flex-col lg:table-row-group">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder = virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        const isSelected = selectedIds.has(item.id);
                        const commentText = truncateText(stripHtml(item.html), 100);
                        const authorName = item.member?.name || item.member?.email || 'Unknown';
                        const hasMember = Boolean(item.member);
                        const memberData = item.member ?? {name: authorName, email: undefined};
                        const memberName = formatMemberName(memberData);
                        const memberInitials = getMemberInitials(memberData);
                        const avatarColor = hasMember ? stringToHslColor(memberName, 75, 55) : undefined;
                        const isBanned = item.member?.commenting_enabled === false;

                        return (
                            <TableRow
                                key={key}
                                {...props}
                                className={`grid w-full grid-cols-[2rem_1fr_5rem] items-center gap-x-4 p-2 hover:bg-muted/50 lg:table-row lg:p-0 ${isSelected ? 'bg-muted/30' : ''}`}
                                data-testid="comment-list-row"
                            >
                                <TableCell className="p-0 lg:table-cell lg:w-12 lg:p-4">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleSelectOne(item.id)}
                                    />
                                </TableCell>
                <TableCell className="col-span-2 min-w-0 p-0 lg:table-cell lg:p-4">
                    <span className="block truncate text-sm">
                        {commentText}
                    </span>
                    {item.parent_id && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Reply to parent</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onFilterByComment(item.parent_id!)}>
                                View parent
                            </Button>
                        </div>
                    )}
                </TableCell>
                                <TableCell className="p-0 lg:table-cell lg:p-4">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            {item.member?.avatar_image && (
                                                <img
                                                    alt={memberName}
                                                    className="absolute inset-0 h-full w-full rounded-full object-cover"
                                                    src={item.member.avatar_image}
                                                />
                                            )}
                                            <AvatarFallback
                                                className={`text-xs ${hasMember ? 'text-white' : ''}`}
                                                style={hasMember ? {backgroundColor: avatarColor} : undefined}
                                            >
                                                {memberInitials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex min-w-0 flex-col">
                                            {item.member?.id ? (
                                                <button
                                                    className="truncate text-left text-sm font-medium text-primary hover:underline"
                                                    type="button"
                                                    onClick={() => onMemberNavigate(item.member!.id)}
                                                >
                                                    {authorName}
                                                </button>
                                            ) : (
                                                <span className="truncate text-sm">{authorName}</span>
                                            )}
                                            {isBanned && (
                                                <span className="text-xs text-destructive">Banned</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="p-0 lg:table-cell lg:p-4">
                                    {item.post ? (
                                        <a
                                            className="block truncate text-sm hover:underline"
                                            href={`#/editor/post/${item.post.id}`}
                                        >
                                            {item.post.title}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="p-0 lg:table-cell lg:p-4">
                                    <Badge variant={getStatusBadgeVariant(item.status)}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="p-0 lg:table-cell lg:p-4">
                                    <span className="text-sm text-muted-foreground">
                                        {formatDate(item.created_at)}
                                    </span>
                                </TableCell>
                                <TableCell className="p-0 lg:table-cell lg:p-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost">
                                                <LucideIcon.MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => item.member?.id && onFilterByMember(item.member.id)} disabled={!item.member?.id}>
                                                <LucideIcon.Filter className="mr-2 h-4 w-4" />
                                                Filter for this member
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            {item.status === 'published' ? (
                                                <DropdownMenuItem onClick={() => onHideComment(item.id)}>
                                                    <LucideIcon.EyeOff className="mr-2 h-4 w-4" />
                                                    Hide comment
                                                </DropdownMenuItem>
                                            ) : item.status === 'hidden' ? (
                                                <DropdownMenuItem onClick={() => onShowComment(item.id)}>
                                                    <LucideIcon.Eye className="mr-2 h-4 w-4" />
                                                    Show comment
                                                </DropdownMenuItem>
                                            ) : null}
                                            {item.status !== 'deleted' && (
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => onDeleteComment(item.id)}
                                                >
                                                    <LucideIcon.Trash2 className="mr-2 h-4 w-4" />
                                                    Delete comment
                                                </DropdownMenuItem>
                                            )}
                                            {item.member?.id && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    {isBanned ? (
                                                        <DropdownMenuItem onClick={() => onUnbanMember(item.member!.id)}>
                                                            <LucideIcon.UserCheck className="mr-2 h-4 w-4" />
                                                            Unban from commenting
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => onBanMember(item.member!.id)}
                                                        >
                                                            <LucideIcon.Ban className="mr-2 h-4 w-4" />
                                                            Ban from commenting
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </TableBody>
            </Table>
        </div>
    );
}

export default CommentsList;
