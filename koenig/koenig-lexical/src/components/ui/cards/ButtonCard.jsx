import React from 'react';
import PropTypes from 'prop-types';
import {Button} from '../Button';

export function ButtonCard({isEditing, buttonText, buttonPlaceholder, buttonUrl}) {
    return (
        <div className={`m-3 flex h-10 items-center justify-center ${isEditing || buttonUrl ? 'opacity-100' : 'opacity-50'} `}>
            <Button value={buttonText} valuePlaceholder={buttonPlaceholder} />
        </div>
    );
}

ButtonCard.propTypes = {
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string, 
    buttonUrl: PropTypes.string
};