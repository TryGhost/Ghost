import clsx from 'clsx';
import React from 'react';
import Heading from '../Heading';

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
            {heading && <Heading className='mb-8'>{heading}</Heading>}
            {children}
        </div>
    );
};

export default ModalPage;
