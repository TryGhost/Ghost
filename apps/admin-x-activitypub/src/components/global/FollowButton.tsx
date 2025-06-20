import React from 'react';
import clsx from 'clsx';
import {Account, Activity, ActivityPubAPI} from '../../api/activitypub';
import {Button} from '@tryghost/shade';
import {postsActions, usePostsStore} from '../../stores/posts-store';
import {toast} from 'sonner';

// API utilities for Valtio experiment
async function getSiteUrl() {
    const response = await fetch('/ghost/api/admin/site');
    const json = await response.json();
    return json.site.url;
}

function createActivityPubAPI(handle: string, siteUrl: string) {
    return new ActivityPubAPI(
        new URL(siteUrl),
        new URL('/ghost/api/admin/identities/', window.location.origin),
        handle
    );
}

// User matching utilities - match by actual identity, not handle formats
function extractDomainAndUsername(handle: string): {domain: string, username: string} | null {
    // Handle formats: @user@domain.com or user@domain.com
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    const parts = cleanHandle.split('@');
    
    if (parts.length !== 2) {
        return null;
    }
    
    return {
        username: parts[0],
        domain: parts[1]
    };
}

function findUserInPosts(posts: Activity[], targetHandle: string): Activity | undefined {
    const target = extractDomainAndUsername(targetHandle);
    if (!target) {
        return undefined;
    }
    
    return posts.find((post) => {
        const actor = post.actor;
        const actorDomain = new URL(actor.id).hostname.replace(/^www\./, '');
        
        // Match by username + domain combination (the actual identity)
        return actor.preferredUsername === target.username && 
               actorDomain === target.domain;
    });
}

function findUserInProfiles(profiles: Map<string, Account>, targetHandle: string): Account | undefined {
    const target = extractDomainAndUsername(targetHandle);
    if (!target) {
        return undefined;
    }
    
    return Array.from(profiles.values()).find((account) => {
        // Match by username + domain combination (the actual identity)  
        const accountHandle = account.handle.startsWith('@') ? account.handle.slice(1) : account.handle;
        const accountParts = accountHandle.split('@');
        return accountParts.length === 2 && 
               accountParts[0] === target.username && 
               accountParts[1] === target.domain;
    });
}

interface FollowButtonProps {
    className?: string;
    following: boolean;
    handle: string;
    type?: 'primary' | 'secondary';
    onFollow?: () => void;
    onUnfollow?: () => void;
    'data-testid'?: string;
}

const noop = () => {};

const FollowButton: React.FC<FollowButtonProps> = ({
    className,
    following,
    handle,
    onFollow = noop,
    onUnfollow = noop,
    'data-testid': testId
}) => {
    // Valtio experiment: Get reactive state from store
    const postsState = usePostsStore();

    // Find user in posts and profiles using clean helper functions
    const allPosts = [...postsState.feedPosts, ...postsState.inboxPosts];
    const userPostInStore = findUserInPosts(allPosts, handle);
    const profileInStore = findUserInProfiles(postsState.profileAccounts, handle);

    // Use store state if available, otherwise fall back to prop
    const dynamicFollowing = userPostInStore?.actor.followedByMe ?? profileInStore?.followedByMe ?? following;

    // Valtio experiment: Simple follow/unfollow with direct API calls
    const handleClick = async () => {
        const newFollowingState = !dynamicFollowing;
        const usernameWithAt = handle.startsWith('@') ? handle : `@${handle}`;

        // Optimistically update the store immediately
        postsActions.toggleFollow(usernameWithAt, newFollowingState);

        try {
            // Make the API call directly
            const siteUrl = await getSiteUrl();
            const api = createActivityPubAPI('index', siteUrl);

            if (newFollowingState) {
                await api.follow(handle);
                toast.success('Followed successfully');
                onFollow();
            } else {
                await api.unfollow(handle);
                toast.success('Unfollowed successfully');
                onUnfollow();
            }
        } catch (error) {
            // Revert on error
            postsActions.toggleFollow(usernameWithAt, dynamicFollowing);
            toast.error(`Failed to ${newFollowingState ? 'follow' : 'unfollow'}`);
        }
    };

    return (
        <Button
            className={clsx(
                'min-w-[90px]',
                className
            )}
            data-testid={testId}
            title={dynamicFollowing ? 'Click to unfollow' : ''}
            variant={!dynamicFollowing ? 'default' : 'outline'}
            onClick={(event) => {
                event?.preventDefault();
                event?.stopPropagation();
                handleClick();
            }}
        >
            {dynamicFollowing ? 'Following' : 'Follow'}
        </Button>
    );
};

export default FollowButton;
