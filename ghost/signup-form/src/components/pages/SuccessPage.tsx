import React from 'react';
import {AppContext} from '../../AppContext';
import {isMinimal} from '../../utils/helpers';

type Props = {
    email: string;
};

export const SuccessPage: React.FC<Props> = ({email}) => {
    const {options} = React.useContext(AppContext);

    if (isMinimal(options)) {
        return <div>
            <h1 className="text-xl font-bold">Now check your email!</h1>
        </div>;
    }
    return <div className='bg-grey-300 p-24'>
        <h1 className="text-4xl font-bold">Now check your email!</h1>
        <p className='pb-3'>An email has been send to {email}.</p>
    </div>;
};
