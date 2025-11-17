import React from 'react';
import {SuccessView} from './success-view';
import {useAppContext} from '../../app-context';

type SuccessPageProps = {
    email: string;
};

export const SuccessPage: React.FC<SuccessPageProps> = ({email}) => {
    const {options} = useAppContext();

    return <SuccessView
        backgroundColor={options.backgroundColor}
        email={email}
        textColor={options.textColor} />;
};
