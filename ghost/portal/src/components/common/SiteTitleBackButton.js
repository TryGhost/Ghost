import React from 'react';
import AppContext from '../../AppContext';

export default class SiteTitleBackButton extends React.Component {
    static contextType = AppContext;

    render() {
        // const {site} = this.context;
        return (
            <>
                <button
                    className='gh-portal-btn gh-portal-btn-site-title-back'
                    onClick = {() => {
                        if (this.props.onBack) {
                            this.props.onBack();
                        } else {
                            this.context.onAction('closePopup');
                        }
                    }}>
                    <span>&larr; </span> Back
                </button>
            </>
        );
    }
}
