import React from 'react';
import {SuccessView} from './SuccessView';
import {isMinimal} from '../../utils/helpers';
import {useAppContext} from '../../AppContext';

type SuccessPageProps = {
    email: string;
};

export const SuccessPage: React.FC<SuccessPageProps> = ({email}) => {
    const {options} = useAppContext();

    return <SuccessView
        backgroundColor={options.backgroundColor}
        email={email}
        icon={options.icon}
        isMinimal={isMinimal(options)}
        textColor={options.textColor}
        title={options.title} />;
};
