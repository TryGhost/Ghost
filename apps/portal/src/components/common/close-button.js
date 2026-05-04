import React from 'react';
import AppContext from '../../app-context';
import CloseIconButton from './close-icon-button';

export default class CloseButton extends React.Component {
    static contextType = AppContext;

    closePopup = () => {
        this.context.doAction('closePopup');
    };

    render() {
        const {onClick} = this.props;

        return <CloseIconButton onClick={onClick || this.closePopup} />;
    }
}
