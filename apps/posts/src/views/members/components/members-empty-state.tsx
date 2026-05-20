import React, {useCallback} from 'react';
import {Button, EmptyIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useAddMember} from '@tryghost/admin-x-framework/api/members';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useNavigate} from '@tryghost/admin-x-framework';

interface MembersEmptyStateProps {
    membershipsEnabled: boolean;
    onMemberCreated?: () => void | Promise<void>;
}

const MembersEmptyState: React.FC<MembersEmptyStateProps> = ({membershipsEnabled, onMemberCreated}) => {
    const {data: currentUser, isLoading: isCurrentUserLoading} = useCurrentUser();
    const {mutateAsync: addMember, isLoading: isAdding} = useAddMember();
    const handleError = useHandleError();
    const navigate = useNavigate();

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
            <div className="flex max-w-lg flex-col items-center gap-3">
                <EmptyIndicator
                    actions={
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                disabled={isAdding || isCurrentUserLoading || !currentUser}
                                onClick={handleAddYourself}
                            >
                                {isAdding ? 'Adding...' : 'Add yourself as a member to test'}
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                Have members already?{' '}
                                <a className="font-medium text-foreground hover:underline" href="#/members/new">Add them manually</a>
                                {' '}or{' '}
                                <button
                                    className="font-medium text-foreground hover:underline"
                                    type="button"
                                    onClick={() => navigate('/members/import')}
                                >
                                    import from CSV
                                </button>
                            </p>
                        </div>
                    }
                    description="Use memberships to allow your readers to sign up and subscribe to your content."
                    title="Start building your audience"
                >
                    <LucideIcon.Users />
                </EmptyIndicator>
            </div>
        </div>
    );
};

export default MembersEmptyState;
