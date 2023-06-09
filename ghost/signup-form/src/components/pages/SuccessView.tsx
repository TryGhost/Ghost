import React from 'react';
import {useAppContext} from '../../AppContext';

export const SuccessView: React.FC<{
    email: string;
    title?: string;
    icon?: string;
    backgroundColor?: string;
    textColor?: string;
}> = ({title, icon, backgroundColor, textColor}) => {
    const {t} = useAppContext();
    return (
        <div
            className='flex h-[100vh] flex-col items-center justify-center bg-grey-200 px-4 sm:px-6 md:px-10'
            data-testid="success-page"
            style={{backgroundColor, color: textColor}}
        >
            {icon && <img alt={title} className='mb-2 h-[64px] w-auto' src={icon}/>}
            <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>{t(`Now check your email!`)}</h1>
            <p className='mb-4 max-w-[600px] text-center sm:mb-[4.1rem]'>{t(`To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!`)}</p>
        </div>
    );
};
