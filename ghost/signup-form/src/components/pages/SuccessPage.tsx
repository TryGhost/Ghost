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
    return <div className='bg-grey-200 flex h-[52vmax] min-h-[320px] flex-col items-center justify-center p-6 md:p-8' data-testid="success-page">
        <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>Now check your email!</h1>
        <p className='mb-5 text-center'>An email has been send to {email}.</p>
    </div>;
};
