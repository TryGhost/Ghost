import React from 'react';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useAppContext} from '../../AppContext';

export const SuccessView: React.FC<{
    email: string;
    isMinimal: boolean;
    backgroundColor?: string;
}> = ({email,isMinimal,backgroundColor}) => {
    const {i18n} = useAppContext();

    if (isMinimal) {
        return (
            <div>
                <h1 className="text-xl font-bold">{i18n(`Now check your email!`)}</h1>
            </div>
        );
    }
    return (
        <div
            className='bg-grey-200 flex h-[52vmax] min-h-[320px] flex-col items-center justify-center p-6 md:p-8'
            data-testid="success-page"
            style={{backgroundColor, color: backgroundColor && textColorForBackgroundColor(backgroundColor)}}
        >
            <h1 className='text-center text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl'>{i18n(`Now check your email!`)}</h1>
            <p className='mb-5 text-center'>{i18n(`An email has been send to ${email}.`)}</p>
        </div>
    );
};
