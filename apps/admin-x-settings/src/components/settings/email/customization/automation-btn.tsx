import React from 'react';
import {CustomizationTrigger} from './trigger';

type AutomationBtnProps = {
    id: string;
};

export const AutomationBtn: React.FC<AutomationBtnProps> = ({id}) => {
    return <CustomizationTrigger
        id={id}
        label='Customize Automation'
        type='automation'
    />;
};
