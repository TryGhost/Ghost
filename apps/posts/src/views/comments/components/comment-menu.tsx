import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    LucideIcon
} from '@tryghost/shade';

interface CommentMenuProps {
    commentId: string;
    postUrl?: string;
    memberId?: string | null;
    canComment?: boolean | null;
    commentPermalinksEnabled?: boolean;
    disableMemberCommentingEnabled?: boolean;
    onDisableCommenting?: () => void;
    onEnableCommenting?: () => void;
}

export function CommentMenu({
    commentId,
    postUrl,
    memberId,
    canComment,
    commentPermalinksEnabled,
    disableMemberCommentingEnabled,
    onDisableCommenting,
    onEnableCommenting
}: CommentMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="relative z-10 text-gray-800 hover:bg-secondary [&_svg]:size-4"
                    size="sm"
                    variant="ghost"
                >
                    <LucideIcon.Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {postUrl && (
                    commentPermalinksEnabled ? (
                        <DropdownMenuItem asChild>
                            <a href={`${postUrl}#ghost-comments-${commentId}`} rel="noopener noreferrer" target="_blank">
                                <LucideIcon.ExternalLink className="mr-2 size-4" />
                                View on post
                            </a>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem asChild>
                            <a href={postUrl} rel="noopener noreferrer" target="_blank">
                                <LucideIcon.ExternalLink className="mr-2 size-4" />
                                View post
                            </a>
                        </DropdownMenuItem>
                    )
                )}
                {memberId && (
                    <DropdownMenuItem asChild>
                        <a href={`#/members/${memberId}`}>
                            <LucideIcon.User className="mr-2 size-4" />
                            View member
                        </a>
                    </DropdownMenuItem>
                )}
                {disableMemberCommentingEnabled && memberId && (
                    canComment !== false ? (
                        <DropdownMenuItem onClick={() => {
                            queueMicrotask(() => onDisableCommenting?.());
                        }}>
                            <LucideIcon.MessageCircleOff className="mr-2 size-4" />
                            Disable commenting
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => onEnableCommenting?.()}>
                            <LucideIcon.MessageCircle className="mr-2 size-4" />
                            Enable commenting
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
