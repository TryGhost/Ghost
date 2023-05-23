import React from 'react';

type Props = {
    email: string;
};

export const Success: React.FC<Props> = ({email}) => {
    return <div className='bg-grey-300 p-24'>
        <h1 className="text-4xl font-bold">Now check your email!</h1>
        <p className='pb-3'>An email has been send to {email}.</p>
    </div>;
};
