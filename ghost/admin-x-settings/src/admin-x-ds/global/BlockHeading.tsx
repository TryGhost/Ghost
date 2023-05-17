import React from 'react';

import Heading from './Heading';
import Separator from './Separator';

interface BlockHeadingProps {
    title: string,
    grey?: boolean,
    separator?: boolean
}

const BlockHeading: React.FC<BlockHeadingProps> = ({title, grey, separator, ...props}) => {
    const CustomHeading = (
        <Heading
            grey={grey}
            level={6}
            {...props}
        >
            {title}
        </Heading>
    );

    if (separator) {
        return (
            <div className='mb-3 flex flex-col gap-1'>
                {CustomHeading}
                <Separator />
            </div>
        );
    } else {
        return CustomHeading;
    }
};

export default BlockHeading;