import React from 'react';
import PropTypes from 'prop-types';
import {Button} from '../Button';

export function ButtonCard({buttonText, buttonPlaceholder}) {
    return (
        <div className="m-3 flex h-10 items-center justify-center">
            <Button value={buttonText} valuePlaceholder={buttonPlaceholder} />
        </div>
    );
}

ButtonCard.propTypes = {
    buttonText: PropTypes.string,
    buttonPlaceholder: PropTypes.string
};