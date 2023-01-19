import React from 'react';
import PropTypes from 'prop-types';
import {Button} from '../Button';

export function EmailCtaCard({isSelected, visibility, alignment, separators, value, placeholder, button, buttonText}) {
    return (
        <div className="pb-6">
            <div className="pt-1 pb-7 font-sans text-xs font-semibold uppercase tracking-tight text-grey">
                {visibility}
            </div>
            {separators && <hr className="-mt-4 mb-12 block border-t-grey-300" />}
            <input className={`w-full font-serif text-xl text-grey-900 ${alignment === 'left' ? 'text-left' : 'text-center'} ` } value={value} placeholder={placeholder} />
            { (button && (isSelected || buttonText)) && 
                <div className={`mt-6 ${alignment === 'left' ? 'text-left' : 'text-center'} ` }>
                    <Button valuePlaceholder="Add button text" value={buttonText} />
                </div>    
            }
            {separators && <hr className="mt-12 block border-t-grey-300" />}

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