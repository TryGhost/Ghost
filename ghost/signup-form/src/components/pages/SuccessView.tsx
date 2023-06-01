import React from 'react';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

export const SuccessView: React.FC<{
    email: string;
    isMinimal: boolean;
    title?: string
    logo?: string
    backgroundColor?: string;
}> = ({isMinimal, title, logo, backgroundColor}) => {
    if (isMinimal) {
        return (
            <div>
                <h1 className="text-xl font-bold">Now check your email!</h1>
            </div>
        );
    }
    return (
        <div
            className='flex h-[100vh] flex-col items-center justify-center bg-grey-200 px-4 sm:px-6 md:px-10'
            data-testid="success-page"
            style={{backgroundColor, color: backgroundColor && textColorForBackgroundColor(backgroundColor)}}
        >   
            {logo && <img alt={title} className='h-[64px] w-auto mb-2' src={logo}/>}
            <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>Now check your email!</h1>
            <p className='mb-4 sm:mb-[4.1rem] text-center'>To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!</p>
        </div>
    );
};
