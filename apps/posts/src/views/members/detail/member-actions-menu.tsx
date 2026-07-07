import MemberImpersonateModal from './member-impersonate-modal';
import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {canManageMembers} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberActionsMenuProps {
    member: Member;
}

/**
 * The "Actions" gear menu in the member-detail header. Gated on `canManageMembers`
 * (contributors don't see it) and holds every member-level action modal:
 * Impersonate (this slice), Sign out of all devices, Delete member,
 * Disable/Enable commenting (later slices).
 */
const MemberActionsMenu: React.FC<MemberActionsMenuProps> = ({member}) => {
    const {data: currentUser} = useCurrentUser();
    const [showImpersonate, setShowImpersonate] = React.useState(false);

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
                </DropdownMenuContent>
            </DropdownMenu>

            <MemberImpersonateModal
                memberId={member.id}
                open={showImpersonate}
                onOpenChange={setShowImpersonate}
            />
        </>
    );
};

export default MemberActionsMenu;
