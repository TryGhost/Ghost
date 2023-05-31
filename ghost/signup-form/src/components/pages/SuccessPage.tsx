import React from 'react';
import {SuccessView} from './SuccessView';
import {isMinimal} from '../../utils/helpers';
import {useAppContext} from '../../AppContext';

type SuccessPageProps = {
    email: string;
};

export const SuccessPage: React.FC<SuccessPageProps> = ({email}) => {
    const {options} = useAppContext();

    return <SuccessView email={email} isMinimal={isMinimal(options)} />;
};
