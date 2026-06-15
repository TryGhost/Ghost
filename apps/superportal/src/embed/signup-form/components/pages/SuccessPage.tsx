import type {ReactElement} from 'react';
import {useAppContext} from '../../app-context';
import {SuccessView} from './SuccessView';

interface SuccessPageProps {
    email: string;
}

export function SuccessPage({email}: SuccessPageProps): ReactElement {
    const {options} = useAppContext();
    return (
        <SuccessView
            backgroundColor={options.backgroundColor}
            email={email}
            textColor={options.textColor}
        />
    );
}
