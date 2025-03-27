import ArticleModal from '../components/feed/ArticleModal';
import NiceModal from '@ebay/nice-modal-react';
import {type Activity} from '@tryghost/admin-x-framework/api/activitypub';

export const handleViewContent = (
    activity: Activity,
    focusReply = false
) => {
    const authorActor = getContentAuthor(activity);
    NiceModal.show(ArticleModal, {
        activityId: activity.id,
        object: activity.object,
        actor: authorActor,
        focusReply,
        width: activity.object.type === 'Article' ? 'wide' : 'narrow'
    });
};

export const getContentAuthor = (activity: Activity) => {
    const actor = activity.actor;
    const attributedTo = activity.object.attributedTo;

    if (!attributedTo) {
        return actor;
    }

    if (typeof attributedTo === 'string') {
        return actor;
    }

    if (Array.isArray(attributedTo)) {
        const found = attributedTo.find(item => typeof item !== 'string');
        if (found) {
            return found;
        } else {
            return actor;
        }
    }

    return attributedTo;
};
