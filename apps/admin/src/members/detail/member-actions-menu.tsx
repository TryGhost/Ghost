import MemberDeleteModal from './member-delete-modal';
import MemberDisableCommentingModal from './member-disable-commenting-modal';
import MemberImpersonateModal from './member-impersonate-modal';
import MemberLogoutModal from './member-logout-modal';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {canManageMembers} from '@tryghost/admin-x-framework/api/users';
import {getMemberCommentingActionLabel, isMemberCommentingDisabled} from './member-commenting';
import {toast} from 'sonner';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useEnableMemberCommenting, useMembersFetching} from '@tryghost/admin-x-framework/api/members';
import {useQueryClient} from '@tanstack/react-query';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberActionsMenuProps {
    member: Member;
    /**
     * Called just before an action modal navigates the user away (delete →
     * `/members`) — parent flips its unsaved-changes bypass so the discard
     * dialog doesn't intercept the redirect for a member that no longer exists.
     */
    allowLeaveWithUnsavedChanges: () => void;
}

/**
 * The "Actions" gear menu in the member-detail header. Gated on `canManageMembers`
 * (contributors don't see it) and holds every member-level action modal:
 * Impersonate, Sign out of all devices, Disable/Enable commenting, Delete member.
 */
const MemberActionsMenu: React.FC<MemberActionsMenuProps> = ({member, allowLeaveWithUnsavedChanges}) => {
    const queryClient = useQueryClient();
    const {data: currentUser} = useCurrentUser();
    const [showImpersonate, setShowImpersonate] = React.useState(false);
    const [showLogout, setShowLogout] = React.useState(false);
    const [showDisableCommenting, setShowDisableCommenting] = React.useState(false);
    const [showDelete, setShowDelete] = React.useState(false);

    const enableCommenting = useEnableMemberCommenting();
    // Stays > 0 through the mutation AND the follow-up members refetch, so a
    // second click can't fire while the label is still showing "Enable
    // commenting" from a stale `member` prop.
    const membersRefetching = useMembersFetching();
    const commentingBusy = enableCommenting.isPending || (enableCommenting.isSuccess && membersRefetching);
    const commentingDisabled = isMemberCommentingDisabled(member);
    const commentingLabel = getMemberCommentingActionLabel(member);
    const displayName = member.name || member.email || 'this member';

    if (!currentUser || !canManageMembers(currentUser)) {
        return null;
    }

    const onCommentingSelect = async () => {
        // Disable → open the confirm modal (needs the hide-comments checkbox);
        // Enable → fire directly. Matches Ember `controllers/member.js:200-224`.
        if (!commentingDisabled) {
            setShowDisableCommenting(true);
            return;
        }
        try {
            await enableCommenting.mutateAsync({id: member.id});
            toast.success(`Commenting has been enabled for ${displayName}.`);
        } catch {
            toast.error('Couldn’t enable commenting. Please try again.');
            return;
        }
        // Fire-and-forget the extra members-cache refresh so the menu label
        // flips back on the next render. Not awaited: a follow-up refetch
        // failure must NOT flip the toast to an error (the enable itself
        // succeeded and is already reflected server-side).
        void queryClient.invalidateQueries({queryKey: ['MembersResponseType']});
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-label='Actions' className='size-(--control-height)' data-testid='member-actions' size='icon' variant='outline'>
                        <LucideIcon.Ellipsis size={16} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                        data-testid='member-actions-impersonate'
                        onSelect={() => setShowImpersonate(true)}
                    >
                        Impersonate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        data-testid='member-actions-logout'
                        onSelect={() => setShowLogout(true)}
                    >
                        Sign out of all devices
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        data-testid='member-actions-commenting'
                        disabled={commentingBusy}
                        onSelect={() => void onCommentingSelect()}
                    >
                        {commentingLabel}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        data-testid='member-actions-delete'
                        onSelect={() => setShowDelete(true)}
                    >
                        Delete member
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <MemberImpersonateModal
                memberId={member.id}
                open={showImpersonate}
                onOpenChange={setShowImpersonate}
            />
            <MemberLogoutModal
                member={member}
                open={showLogout}
                onOpenChange={setShowLogout}
            />
            <MemberDisableCommentingModal
                member={member}
                open={showDisableCommenting}
                onOpenChange={setShowDisableCommenting}
            />
            <MemberDeleteModal
                allowLeaveWithUnsavedChanges={allowLeaveWithUnsavedChanges}
                member={member}
                open={showDelete}
                onOpenChange={setShowDelete}
            />
        </>
    );
};

export default MemberActionsMenu;
