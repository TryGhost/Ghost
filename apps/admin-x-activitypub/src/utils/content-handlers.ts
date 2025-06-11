import {type Activity} from '@tryghost/admin-x-framework/api/activitypub';

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
