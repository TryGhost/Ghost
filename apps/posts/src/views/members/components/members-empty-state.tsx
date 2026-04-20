import React, {useCallback, useState} from 'react';
import {Button, EmptyIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useNavigate} from '@tryghost/admin-x-framework';

const MembersEmptyState: React.FC<{onMemberCreated?: () => void}> = ({onMemberCreated}) => {
    const {data: settingsData} = useBrowseSettings({});
    const {data: currentUser} = useCurrentUser();
    const navigate = useNavigate();
    const [isAdding, setIsAdding] = useState(false);

    const {assetRoot} = getGhostPaths();
    const membersSignupAccess = getSettingValue<string>(settingsData?.settings ?? null, 'members_signup_access');
    const membershipsEnabled = membersSignupAccess !== 'none';

    const handleAddYourself = useCallback(async () => {
        if (!currentUser || isAdding) {
            return;
        }

        setIsAdding(true);
        try {
            const {apiRoot} = getGhostPaths();
            const response = await fetch(`${apiRoot}/members/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    members: [{
                        email: currentUser.email,
                        name: currentUser.name
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create member');
            }

            toast.success('You\'ve been added as a member');
            onMemberCreated?.();
        } catch {
            toast.error('Failed to add member', {
                description: 'There was a problem adding you as a member. Please try again.'
            });
        } finally {
            setIsAdding(false);
        }
    }, [currentUser, isAdding, onMemberCreated]);

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
                                disabled={isAdding}
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

                <div className="mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                    <a
                        className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm"
                        href="https://ghost.org/resources/build-audience-subscriber-signups/"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <div
                            className="h-36 w-full bg-cover bg-center"
                            style={{backgroundImage: `url(${assetRoot}img/marketing/members-1.jpg)`}}
                        />
                        <div className="flex grow flex-col p-5">
                            <h4 className="text-sm font-semibold">
                                Building your audience with subscriber signups
                            </h4>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                Learn how to turn anonymous visitors into logged-in members with memberships in Ghost.
                            </p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                Start building
                                <LucideIcon.ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </div>
                    </a>

                    <a
                        className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm"
                        href="https://ghost.org/resources/first-100-email-subscribers/"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <div
                            className="h-36 w-full bg-cover bg-center"
                            style={{backgroundImage: `url(${assetRoot}img/marketing/members-2.jpg)`}}
                        />
                        <div className="flex grow flex-col p-5">
                            <h4 className="text-sm font-semibold">
                                Get your first 100 email subscribers
                            </h4>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                Starting from zero? Use this guide to find your founding audience members.
                            </p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                Become an expert
                                <LucideIcon.ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default MembersEmptyState;
