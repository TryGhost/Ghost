import React, {ReactNode} from 'react';

export type Activity = {
    type: string,
    object: {
        type: string
    }
}

interface ActivityItemProps {
    children?: ReactNode;
}

const ActivityItem: React.FC<ActivityItemProps> = ({children}) => {
    const childrenArray = React.Children.toArray(children);

    return (
        <div className='flex w-full max-w-[560px] flex-col'>
            <div className='flex w-full items-center gap-3 border-b border-grey-100 py-4'>
                {childrenArray[0]}
                {childrenArray[1]}
            </div>
        </div>
    );
};

export default ActivityItem;
