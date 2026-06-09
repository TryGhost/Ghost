import React from 'react';
import {LoadingIndicator} from '@tryghost/shade/components';
import {Navigate, useLocation, useParams} from '@tryghost/admin-x-framework';
import {TagDetailsForm} from './tag-details-form';
import {getTagBySlug} from '@tryghost/admin-x-framework/api/tags';
import {isAuthorOrContributor} from '@tryghost/admin-x-framework/api/users';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';

function TagNotFound() {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">404</h1>
                <span aria-hidden="true">|</span>
                <h2 className="text-lg">Page not found</h2>
            </div>
        </div>
    );
}

const TagDetails: React.FC = () => {
    const {tagSlug} = useParams();
    const location = useLocation();
    const isNew = !tagSlug;

    const {data: currentUser, isLoading: isUserLoading} = useCurrentUser();
    const {data, isLoading} = getTagBySlug(tagSlug ?? '', {
        enabled: !isNew,
        defaultErrorHandler: false
    });

    if (isUserLoading || !currentUser) {
        return null;
    }

    // Authors and contributors cannot manage tags (mirrors the Ember route guard)
    if (isAuthorOrContributor(currentUser)) {
        return <Navigate to="/" replace />;
    }

    if (isNew) {
        return <TagDetailsForm key="new" />;
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingIndicator size="lg" />
            </div>
        );
    }

    const tag = data?.tags?.[0];

    // Only show the 404 when there is no data at all — a failed background
    // refetch sets isError while stale data is still available, and unmounting
    // the form in that case would discard the user's in-progress edits.
    if (!tag) {
        return <TagNotFound />;
    }

    return (
        <TagDetailsForm
            key={tag.id}
            initialSaveState={location.state?.justSaved ? 'saved' : 'idle'}
            tag={tag}
        />
    );
};

export default TagDetails;
