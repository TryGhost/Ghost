import React from 'react';
import AppContext from '../../app-context';
import {t} from '../../utils/i18n';

export default class SiteTitleBackButton extends React.Component {
    static contextType = AppContext;

    render() {
        return (
            <>
                <button
                    className='gh-portal-btn gh-portal-btn-site-title-back'
                    onClick = {() => {
                        if (this.props.onBack) {
                            this.props.onBack();
                        } else {
                            this.context.doAction('closePopup');
                        }
                    }}>
                    <span>&larr; </span> {t('Back')}
                </button>
            </>
        );
    }
}
