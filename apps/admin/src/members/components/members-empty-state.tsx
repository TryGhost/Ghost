import React, {useCallback} from 'react';
import {Button, EmptyIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useAddMember} from '@tryghost/admin-x-framework/api/members';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

interface MembersEmptyStateProps {
    membershipsEnabled: boolean;
    onMemberCreated?: () => void | Promise<void>;
}

const MembersEmptyState: React.FC<MembersEmptyStateProps> = ({membershipsEnabled, onMemberCreated}) => {
    const {data: currentUser, isLoading: isCurrentUserLoading} = useCurrentUser();
    const {mutateAsync: addMember, isLoading: isAdding} = useAddMember();
    const handleError = useHandleError();

    const handleAddYourself = useCallback(async () => {
        if (!currentUser || isAdding) {
            return;
        }

        try {
            await addMember({
                email: currentUser.email,
                name: currentUser.name
            });
            toast.success('You\'ve been added as a member');
            await onMemberCreated?.();
        } catch (error) {
            handleError(error);
        }
    }, [addMember, currentUser, handleError, isAdding, onMemberCreated]);

    if (!membershipsEnabled) {
        return (
            <div className="flex h-full flex-col items-center justify-center px-4">
                <EmptyIndicator
                    actions={
                        <Button variant="outline" asChild>
                            <a href="#/settings/members">Membership settings</a>
                        </Button>
                    }
                    description="Adjust your membership settings to start adding members."
                    title="Memberships have been disabled"
                >
                    <LucideIcon.Users />
                </EmptyIndicator>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col items-center justify-center px-4">
            <EmptyIndicator
                actions={
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex flex-col items-center gap-2 sm:flex-row">
                            <Button asChild>
                                <a href="#/members/new?back=%2Fmembers">New member</a>
                            </Button>
                            <Button
                                disabled={isAdding || isCurrentUserLoading || !currentUser}
                                variant="outline"
                                onClick={() => void handleAddYourself()}
                            >
                                {isAdding ? 'Adding...' : 'Add yourself as a member'}
                            </Button>
                        </div>
                        <p className="text-sm leading-tight text-pretty text-muted-foreground">
                            Already have members? <a className="font-medium text-foreground underline-offset-4 hover:underline" href="#/members/import">Import with CSV</a>
                        </p>
                    </div>
                }
                description="Use memberships to allow your readers to sign up and subscribe to your content."
                title="Start building your audience"
            >
                <LucideIcon.Users />
            </EmptyIndicator>
        </div>
    );
};

export default MembersEmptyState;
