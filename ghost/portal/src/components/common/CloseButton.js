import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

export default class CloseButton extends React.Component {
    static contextType = AppContext;
    render() {
        return (
            <div className='gh-portal-closeicon-container'>
                <CloseIcon className='gh-portal-closeicon' alt='Close' onClick = {() => this.context.onAction('closePopup')} />
            </div>
        );
    }
}