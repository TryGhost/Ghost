import React from 'react';
import PropTypes from 'prop-types';
import {Button} from '../Button';

export const HEADER_COLORS = {
    dark: 'bg-black',
    light: 'bg-grey-100',
    accent: 'bg-pink'
};

export function HeaderCard({size, backgroundColor, heading, headingPlaceholder, subHeading, subHeadingPlaceholder, button, buttonText, buttonPlaceholder}) {
    return (
        <div className={`flex flex-col items-center justify-center text-center font-sans ${(size === 'small') ? 'min-h-[40vh] py-[14vmin]' : (size === 'medium') ? 'min-h-[60vh] py-[12vmin]' : 'min-h-[80vh] py-[18vmin]'} ${HEADER_COLORS[backgroundColor]} `}>
            <h2 className={`font-extrabold leading-tight ${(size === 'small') ? 'text-6xl' : (size === 'medium') ? 'text-7xl' : 'text-8xl'} ${(backgroundColor === 'light') ? 'text-black' : 'text-white'} ${heading || 'opacity-50'}`}>{heading || headingPlaceholder}</h2>
            <h3 className={`w-full font-normal ${(size === 'small') ? 'mt-2 text-2xl' : (size === 'medium') ? 'mt-3 text-[2.7rem]' : 'mt-3 text-3xl'} ${(backgroundColor === 'light') ? 'text-black' : 'text-white'} ${subHeading || 'opacity-50'}`}>{subHeading || subHeadingPlaceholder}</h3>
            <div className={`${(size === 'small') ? 'mt-6' : (size === 'medium') ? 'mt-8' : 'mt-10'}`}>
                {((button && (backgroundColor === 'light')) && <Button value={buttonText} valuePlaceholder={buttonPlaceholder} size={size} />) || (button && <Button value={buttonText} valuePlaceholder={buttonPlaceholder} size={size} color='light' />)}
            </div>
        </div>
    );
}

HeaderCard.propTypes = {
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    backgroundColor: PropTypes.oneOf(['dark', 'light', 'accent']),
    heading: PropTypes.string,
    headingPlaceholder: PropTypes.string,
    subHeading: PropTypes.string,
    subHeadingPlaceholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string
};