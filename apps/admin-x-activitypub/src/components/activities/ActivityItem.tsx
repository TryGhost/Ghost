import React, {ReactNode} from 'react';

import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

export type Activity = {
    type: string,
    actor: ActorProperties,
    object: ObjectProperties & {
        inReplyTo: ObjectProperties | string | null
        replies: Activity[]
    }
}

interface ActivityItemProps {
    children?: ReactNode;
    url?: string | null;
    onClick?: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({children, url = null, onClick}) => {
    const childrenArray = React.Children.toArray(children);

    const Item = (
        <div className='flex w-full max-w-[560px] cursor-pointer flex-col hover:bg-grey-75' onClick={() => {
            if (!url && onClick) {
                onClick();
            }
        }}>
            <div className='flex w-full gap-4 border-b border-grey-100 px-2 py-4'>
                {childrenArray[0]}
                {childrenArray[1]}
                {childrenArray[2]}
            </div>
        </div>
    );

    if (url) {
        return (
            <a href={url} rel='noreferrer' target='_blank' onClick={(e) => {
                if (onClick) {
                    e.preventDefault();
                    onClick();
                }
            }}>
                {Item}
            </a>
        );
    }

    return Item;
};

export default ActivityItem;
