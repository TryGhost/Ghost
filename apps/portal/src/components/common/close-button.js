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
            <button
                type='button'
                className='gh-portal-closeicon-container'
                aria-label='Close popup'
                data-testid='close-popup'
                data-test-button='close-popup'
                onClick={onClick || this.closePopup}
            >
                <CloseIcon className='gh-portal-closeicon' aria-hidden='true' />
            </button>
        );
    }
}
