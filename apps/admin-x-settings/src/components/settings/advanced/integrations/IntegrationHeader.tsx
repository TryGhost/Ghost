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
        <div className='-mx-8 -mt-8 flex flex-col gap-4 bg-grey-75 p-8 md:flex-row dark:bg-grey-950'>
            <div className='h-14 w-14'>{icon}</div>
            <div className='mt-1.5 flex min-w-0 flex-1 flex-col'>
                <h3>{title}</h3>
                <div>{detail}</div>
                {extra && (
                    <div className='mt-4'>{extra}</div>
                )}
            </div>
        </div>
    );
};

export default IntegrationHeader;
