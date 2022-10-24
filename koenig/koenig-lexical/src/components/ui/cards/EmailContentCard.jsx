import React from 'react';
import PropTypes from 'prop-types';
import {ReactComponent as HelpIcon} from '../../../assets/icons/help.svg';

export function EmailContentCard({value, placeholder, isSelected}) {
    return (
        <>
            <input className="text-xl font-serif w-full text-grey-900 p-3" value={value} placeholder={placeholder} />
            {isSelected && 
                <div className="w-full flex items-center justify-center leading-8 font-normal bg-grey-100 p-2 text-grey-600 font-sans text-sm">
                    Only visible when delivered by email, this card will not be published on your site.
                    <a href="https://ghost.org/help/email-newsletters/#email-cards" target="_blank" rel="noopener noreferrer">
                        <HelpIcon className="ml-1 mt-[1px] stroke-[1.2px]" />
                    </a>
                </div>
            }
        </>
    );
}

EmailContentCard.propTypes = {
    isSelected: PropTypes.bool,
    value: PropTypes.string,
    placeholder: PropTypes.string
};