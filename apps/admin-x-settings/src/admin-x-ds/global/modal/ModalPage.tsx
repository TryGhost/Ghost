import Heading from '../Heading';
import React from 'react';
import clsx from 'clsx';

interface ModalPageProps {
    heading?: string;
    children?: React.ReactNode;
    className?: string;
}

const ModalPage: React.FC<ModalPageProps> = ({heading, children, className}) => {
    className = clsx(
        'h-full w-full p-[8vmin] pt-5',
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