import {Comment, useDeleteComment, useHideComment, useShowComment} from '@tryghost/admin-x-framework/api/comments';
import {useDisableMemberCommenting, useEnableMemberCommenting} from '@tryghost/admin-x-framework/api/members';
import {useState} from 'react';

interface MemberToDisable {
    member: Comment['member'];
    commentId: string;
}

export function useCommentMutations() {
    const {mutate: hideComment} = useHideComment();
    const {mutate: showComment} = useShowComment();
    const {mutate: deleteComment} = useDeleteComment();
    const {mutate: disableCommenting} = useDisableMemberCommenting();
    const {mutate: enableCommenting} = useEnableMemberCommenting();

    const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
    const [memberToDisable, setMemberToDisable] = useState<MemberToDisable | null>(null);

    const confirmDelete = () => {
        if (commentToDelete) {
            deleteComment({id: commentToDelete.id});
            setCommentToDelete(null);
        }
    };

    const confirmDisableCommenting = (hideComments: boolean) => {
        if (memberToDisable?.member?.id) {
            disableCommenting({
                id: memberToDisable.member.id,
                reason: `Disabled from comment ${memberToDisable.commentId}`,
                hideComments
            });
            setMemberToDisable(null);
        }
    };

    const handleEnableCommenting = (member: Comment['member']) => {
        if (member?.id) {
            enableCommenting({id: member.id});
        }
    };

    return {
        // Mutations
        hideComment,
        showComment,
        deleteComment,

        // Delete dialog state
        commentToDelete,
        setCommentToDelete,
        confirmDelete,

        // Disable commenting dialog state
        memberToDisable,
        setMemberToDisable,
        confirmDisableCommenting,
        handleEnableCommenting
    };
}
