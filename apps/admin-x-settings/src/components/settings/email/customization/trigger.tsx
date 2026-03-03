import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {type EmailCustomizationType} from './types';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type CustomizationTriggerProps = {
    type: EmailCustomizationType;
    id: string;
    label?: string;
};

export const CustomizationTrigger: React.FC<CustomizationTriggerProps> = ({type, id, label}) => {
    const {updateRoute} = useRouting();

    return (
        <Button
            className='mt-[-5px]'
            color='clear'
            label={label || 'Customize'}
            size='sm'
            onClick={() => {
                updateRoute(`newsletters/customize/${type}/${id}`);
            }}
        />
    );
};
