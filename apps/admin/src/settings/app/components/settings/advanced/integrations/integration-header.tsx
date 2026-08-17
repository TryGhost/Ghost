import React from 'react';
import {Stack} from '@tryghost/shade/primitives';

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
        <Stack className='-mx-8 -mt-8 bg-background p-8 md:flex-row' gap='md'>
            <div className='size-14'>{icon}</div>
            <Stack className='mt-1.5 min-w-0 flex-1' gap='none'>
                <h3>{title}</h3>
                <div>{detail}</div>
                {extra && (
                    <div className='mt-4'>{extra}</div>
                )}
            </Stack>
        </Stack>
    );
};

export default IntegrationHeader;
