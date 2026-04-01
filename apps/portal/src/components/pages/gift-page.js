import {useContext} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import LoadingPage from './loading-page';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

const GiftPage = () => {
    const {site} = useContext(AppContext);

    if (!site) {
        return <LoadingPage />;
    }

    return (
        <div className='gh-portal-content gh-portal-gift'>
            <CloseButton />
            <header className='gh-portal-header'>
                <h1 className='gh-portal-main-title'>Gift a subscription</h1>
            </header>
            <div className='gh-portal-section'>
                <p>Give the gift of a subscription to <strong>{site.title || 'this site'}</strong>.</p>
            </div>
        </div>
    );
};

export default GiftPage;
