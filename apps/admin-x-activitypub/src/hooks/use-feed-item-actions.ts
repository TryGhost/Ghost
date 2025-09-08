import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {toast} from 'sonner';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from '@tryghost/admin-x-framework';

import getUsername from '../utils/get-username';
import {handleProfileClick} from '../utils/handle-profile-click';
import {useDeleteMutationForUser, useFollowMutationForUser, useUnfollowMutationForUser} from './use-activity-pub-queries';

interface UseFeedItemActionsOptions {
    author: ActorProperties;
    object: ObjectProperties;
    parentId?: string;
    handle?: string;
    enableProfileLinkHandling?: boolean;
}

export function useFeedItemActions({
    author,
    object,
    parentId,
    handle = 'index',
    enableProfileLinkHandling = false
}: UseFeedItemActionsOptions) {
    const navigate = useNavigate();
    const contentRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    // Mutations
    const deleteMutation = useDeleteMutationForUser(handle);

    const followMutation = useFollowMutationForUser(
        handle,
        () => {
            toast.success(`Followed ${author?.name}`);
        },
        () => {
            toast.error('Failed to follow');
        }
    );

    const unfollowMutation = useUnfollowMutationForUser(
        handle,
        () => {
            toast.info(`Unfollowed ${author?.name}`);
        },
        () => {
            toast.error('Failed to unfollow');
        }
    );

    // Profile link click handling effect
    useEffect(() => {
        if (!enableProfileLinkHandling) {
            return;
        }

        const element = contentRef.current;
        if (!element) {
            return;
        }

        const handleProfileLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a[data-profile]');

            if (link) {
                const profileHandle = link.getAttribute('data-profile')?.trim();
                const isValidHandle = /^@([\w.-]+)@([\w-]+\.[\w.-]+[a-zA-Z])$/.test(profileHandle || '');

                if (isValidHandle && profileHandle) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleProfileClick(profileHandle, navigate);
                }
            }
        };

        element.addEventListener('click', handleProfileLinkClick);
        return () => {
            element.removeEventListener('click', handleProfileLinkClick);
        };
    }, [navigate, object?.content, enableProfileLinkHandling]);

    // Action handlers
    const handleDelete = (onDelete?: () => void) => {
        deleteMutation.mutate({id: object.id, parentId});
        onDelete?.();
    };

    const handleCopyLink = async () => {
        if (object?.url) {
            await navigator.clipboard.writeText(object.url);
            setIsCopied(true);
            toast.success('Link copied');
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const authorHandle = author ? getUsername(author) : null;

    const handleFollow = () => {
        if (authorHandle) {
            followMutation.mutate(authorHandle);
        }
    };

    const handleUnfollow = () => {
        if (authorHandle) {
            unfollowMutation.mutate(authorHandle);
        }
    };

    return {
        contentRef,
        isCopied,
        mutations: {
            deleteMutation,
            followMutation,
            unfollowMutation
        },
        actions: {
            handleDelete,
            handleCopyLink,
            handleFollow,
            handleUnfollow
        }
    };
}
