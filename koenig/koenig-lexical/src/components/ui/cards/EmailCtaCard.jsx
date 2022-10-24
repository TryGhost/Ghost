import React from 'react';
import PropTypes from 'prop-types';
import {Button} from './ButtonCard';

export function EmailCtaCard({isSelected, visibility, alignment, separators, value, placeholder, button, buttonText}) {
    return (
        <div className="px-3 pb-6">
            <div className="font-sans text-xs uppercase font-semibold text-grey pt-1 pb-7 tracking-tight">
                {visibility}
            </div>
            {separators && <hr className="-mt-4 mb-12 border-t-grey-300 block" />}
            <input className={`text-xl font-serif w-full text-grey-900 ${alignment === 'left' ? 'text-left' : 'text-center'} ` } value={value} placeholder={placeholder} />
            { (button && (isSelected || buttonText)) && 
                <div className={`mt-6 ${alignment === 'left' ? 'text-left' : 'text-center'} ` }>
                    <Button valuePlaceholder="Add button text" value={buttonText} />
                </div>    
            }
            {separators && <hr className="mt-12 border-t-grey-300 block" />}

        </div>
    );
}

EmailCtaCard.propTypes = {
    isSelected: PropTypes.bool,
    visibility: PropTypes.oneOf(['Free members', 'Paid members']),
    alignment: PropTypes.oneOf(['left', 'center']),
    separators: PropTypes.bool,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    button: PropTypes.bool,
    buttonText: PropTypes.string
};