import React from 'react';
import {isMinimal} from '../../utils/helpers';
import {useAppContext} from '../../AppContext';

type SuccessPageProps = {
    email: string;
};

export const SuccessPage: React.FC<SuccessPageProps> = ({email}) => {
    const {options} = useAppContext();

    if (isMinimal(options)) {
        return <div>
            <h1 className="text-xl font-bold">Now check your email!</h1>
        </div>;
    }
    return <div className='p-24'>
        <h1 className="text-4xl font-bold">Now check your email!</h1>
        <p className='pb-3'>An email has been send to {email}.</p>
    </div>;
};
