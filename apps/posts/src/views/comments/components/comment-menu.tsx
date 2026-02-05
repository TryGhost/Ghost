import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    LucideIcon
} from '@tryghost/shade';
import {Comment} from '@tryghost/admin-x-framework/api/comments';
import {DisableCommentingDialog} from './disable-commenting-dialog';
import {useDisableMemberCommenting, useEnableMemberCommenting} from '@tryghost/admin-x-framework/api/members';
import {useState} from 'react';

interface CommentMenuProps {
    comment: Comment;
    commentPermalinksEnabled?: boolean;
}

export function CommentMenu({
    comment,
    commentPermalinksEnabled
}: CommentMenuProps) {
    const {mutate: disableCommenting} = useDisableMemberCommenting();
    const {mutate: enableCommenting} = useEnableMemberCommenting();
    const [disableDialogOpen, setDisableDialogOpen] = useState(false);

    const {id: commentId, post, member} = comment;
    const postUrl = post?.url;
    const memberId = member?.id;
    const canComment = member?.can_comment;

    const handleDisableCommenting = (hideComments: boolean) => {
        if (memberId) {
            disableCommenting({
                id: memberId,
                reason: `Disabled from comment ${commentId}`,
                hideComments
            });
            setDisableDialogOpen(false);
        }
    };

    const handleEnableCommenting = () => {
        if (memberId) {
            enableCommenting({id: memberId});
        }
    };

    return (
        <>
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
                                    <LucideIcon.ExternalLink className="size-4" />
                                    View on post
                                </a>
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem asChild>
                                <a href={postUrl} rel="noopener noreferrer" target="_blank">
                                    <LucideIcon.ExternalLink className="size-4" />
                                    View post
                                </a>
                            </DropdownMenuItem>
                        )
                    )}
                    {memberId && (
                        <DropdownMenuItem asChild>
                            <a href={`#/members/${memberId}`}>
                                <LucideIcon.User className="size-4" />
                                View member
                            </a>
                        </DropdownMenuItem>

                    )}
                    {memberId && (
                        canComment !== false ? (
                            <DropdownMenuItem onClick={() => setDisableDialogOpen(true)}>
                                <LucideIcon.MessageCircleOff className="size-4" />
                                Disable commenting
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={handleEnableCommenting}>
                                <LucideIcon.MessageCircle className="size-4" />
                                Enable commenting
                            </DropdownMenuItem>
                        )
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <DisableCommentingDialog
                memberName={member?.name}
                open={disableDialogOpen}
                onConfirm={handleDisableCommenting}
                onOpenChange={setDisableDialogOpen}
            />
        </>
    );
}
