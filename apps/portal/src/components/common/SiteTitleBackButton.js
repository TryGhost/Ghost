import React from 'react';
import AppContext from '../../AppContext';
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
                    {/* eslint-disable-next-line i18next/no-literal-string */}
                    <span>&larr; </span> {t('Back')}
                </button>
            </>
        );
    }
}
