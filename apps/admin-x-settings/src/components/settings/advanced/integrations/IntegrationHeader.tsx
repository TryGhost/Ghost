import React from 'react';

interface IntegrationHeaderProps {
    icon?: React.ReactNode;
    title?: React.ReactNode;
    detail?: React.ReactNode;
    extra?: React.ReactNode;
}

const IntegrationHeader: React.FC<IntegrationHeaderProps> = ({
    icon,
    title,
    detail,
    extra
}) => {
    return (
        <div className='flex w-full gap-4'>
            <div className='h-14 w-14'>{icon}</div>
            <div className='flex min-w-0 flex-1 flex-col'>
                <h3>{title}</h3>
                <div className='text-grey-600'>{detail}</div>
                {extra && (
                    <div className='mt-4'>{extra}</div>
                )}
            </div>
        </div>
    );
};

export default IntegrationHeader;
