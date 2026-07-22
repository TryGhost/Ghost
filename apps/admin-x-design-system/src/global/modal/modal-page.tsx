import clsx from 'clsx';
import React from 'react';
import {Text} from '@tryghost/shade/primitives';

export interface ModalPageProps {
    heading?: string;
    children?: React.ReactNode;
    className?: string;
}

const ModalPage: React.FC<ModalPageProps> = ({heading, children, className}) => {
    className = clsx(
        'w-full p-[8vmin] pt-5',
        className
    );
    return (
        <div className={className}>
            {heading && <Text as='h1' className='mb-8 text-4xl' leading='supertight' weight='bold'>{heading}</Text>}
            {children}
        </div>
    );
};

export default ModalPage;
