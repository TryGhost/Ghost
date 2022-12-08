import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

export default class CloseButton extends React.Component {
    static contextType = AppContext;

    closePopup = () => {
        this.context.onAction('closePopup');
    };

    render() {
        const {onClick} = this.props;

        return (
            <div className='gh-portal-closeicon-container' data-test-button='close-popup'>
                <CloseIcon
                    className='gh-portal-closeicon' alt='Close' onClick = {onClick || this.closePopup}
                />
            </div>
        );
    }
}
