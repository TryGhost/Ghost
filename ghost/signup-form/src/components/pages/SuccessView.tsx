import React from 'react';

export const SuccessView: React.FC<{
    email: string;
    isMinimal: boolean;
}> = ({email,isMinimal}) => {
    if (isMinimal) {
        return <div>
            <h1 className="text-xl font-bold">Now check your email!</h1>
        </div>;
    }
    return <div className='flex h-[52vmax] min-h-[320px] flex-col items-center justify-center bg-grey-200 p-6 md:p-8' data-testid="success-page">
        <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>Now check your email!</h1>
        <p className='mb-5 text-center'>An email has been send to {email}.</p>
    </div>;
};
