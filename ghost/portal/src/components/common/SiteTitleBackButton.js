import React from 'react';
import AppContext from '../../AppContext';

export default class SiteTitleBackButton extends React.Component {
    static contextType = AppContext;
    
    render() {
        const {site} = this.context;
        return (
            <>
                <button className='gh-portal-btn gh-portal-btn-site-title-back' onClick = {() => this.context.onAction('closePopup')}>&larr; {site.title}</button>
            </>
        );
    }
}