import React, {ReactNode} from 'react';

import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

export type Activity = {
    id: string,
    type: string,
    actor: ActorProperties,
    object: ObjectProperties & {
        inReplyTo: ObjectProperties | string | null
        replies: Activity[]
        replyCount: number
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
        <div className='relative flex w-full max-w-[560px] cursor-pointer flex-col before:absolute before:inset-x-[-8px] before:inset-y-[-1px] before:rounded-md before:bg-grey-50 before:opacity-0 before:transition-opacity hover:z-10 hover:cursor-pointer hover:border-b-transparent hover:before:opacity-100 dark:before:bg-grey-950' onClick={() => {
            if (!url && onClick) {
                onClick();
            }
        }}>
            <div className='relative z-10 flex w-full gap-3 px-2 py-4'>
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
