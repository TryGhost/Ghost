import React, {ReactNode} from 'react';

import ArticleModal from '../feed/ArticleModal';
import NiceModal from '@ebay/nice-modal-react';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

export type Activity = {
    type: string,
    actor: ActorProperties,
    object: ObjectProperties & {
        inReplyTo: string | null // TODO: Move this to the ObjectProperties type
    }
}

interface ActivityItemProps {
    children?: ReactNode;
    url?: string | null;
    type: 'Create' | 'Follow' | 'Like';
    activity: Activity
}

const ActivityItem: React.FC<ActivityItemProps> = ({children, activity, type, url = null}) => {
    const childrenArray = React.Children.toArray(children);

    const Item = (
        <div className='flex w-full max-w-[560px] flex-col hover:bg-grey-75'>
            <div className='flex w-full gap-4 border-b border-grey-100 px-2 py-4'>
                {childrenArray[0]}
                {childrenArray[1]}
                {childrenArray[2]}
            </div>
        </div>
    );

    if (url && type !== 'Create') {
        return (
            <a href={url} rel='noreferrer' target='_blank'>
                {Item}
            </a>
        );
    }

    if (type === 'Create') {
        function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
            event.preventDefault();
            NiceModal.show(ArticleModal, {object: activity.object, actor: activity.actor, comments: [], allComments: new Map()});
        }
        return (
            <a onClick={handleClick}>
                {Item}
            </a>
        );
    }

    return Item;
};

export default ActivityItem;
