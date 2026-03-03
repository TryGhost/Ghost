import React from 'react';
import {CustomizationTrigger} from './trigger';

type NewsletterBtnProps = {
    id: string;
};

export const NewsletterBtn: React.FC<NewsletterBtnProps> = ({id}) => {
    return <CustomizationTrigger
        id={id}
        label='Customize Newsletter'
        type='newsletter'
    />;
};
