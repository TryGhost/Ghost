import MemberDeleteModal from './member-delete-modal';
import MemberImpersonateModal from './member-impersonate-modal';
import MemberLogoutModal from './member-logout-modal';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {canManageMembers} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
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
 * Impersonate, Sign out of all devices, Delete member,
 * Disable/Enable commenting (later slice).
 */
const MemberActionsMenu: React.FC<MemberActionsMenuProps> = ({member, allowLeaveWithUnsavedChanges}) => {
    const {data: currentUser} = useCurrentUser();
    const [showImpersonate, setShowImpersonate] = React.useState(false);
    const [showLogout, setShowLogout] = React.useState(false);
    const [showDelete, setShowDelete] = React.useState(false);

    if (!currentUser || !canManageMembers(currentUser)) {
        return null;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-label='Actions' data-testid='member-actions' size='icon' variant='outline'>
                        <LucideIcon.Settings size={16} />
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
