import React from 'react';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useAppContext} from '../../AppContext';

export const SuccessView: React.FC<{
    email: string;
    isMinimal: boolean;
    backgroundColor?: string;
}> = ({email,isMinimal,backgroundColor}) => {
    const {t} = useAppContext();

    if (isMinimal) {
        return (
            <div>
                <h1 className="text-xl font-bold">{t(`Now check your email!`)}</h1>
            </div>
        );
    }
    return (
        <div
            className='bg-grey-200 flex h-[100vh] flex-col items-center justify-center p-6 md:p-8'
            data-testid="success-page"
            style={{backgroundColor, color: backgroundColor && textColorForBackgroundColor(backgroundColor)}}
        >
            <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>{t(`Now check your email!`)}</h1>
            <p className='mb-5 text-center'>{t(`An email has been send to ${email}`)}</p>
        </div>
    );
};
