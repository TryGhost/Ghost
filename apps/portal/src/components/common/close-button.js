import React from 'react';
import AppContext from '../../app-context';
import CloseIcon from '../../images/icons/close.svg?react';

export default class CloseButton extends React.Component {
    static contextType = AppContext;

    closePopup = () => {
        this.context.doAction('closePopup');
    };

    render() {
        const {onClick} = this.props;

        return (
            <button className='gh-portal-closeicon-container' data-test-button='close-popup' onClick = {onClick || this.closePopup}>
                <CloseIcon
                    className='gh-portal-closeicon' alt='Close' onClick = {onClick || this.closePopup} data-testid='close-popup'
                />
            </button>
        );
    }
}
