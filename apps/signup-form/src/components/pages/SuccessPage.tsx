import React from 'react';
import {SuccessView} from './SuccessView';
import {useAppContext} from '../../AppContext';

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
