import {useEffect, useState} from 'react';
import SupportError from './SupportError';
import LoadingPage from './LoadingPage';
import setupGhostApi from '../../utils/api';

const SupportPage = () => {
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function checkoutDonation() {
            const siteUrl = window.location.origin;
            const currentUrl = siteUrl + window.location.pathname;
            const successUrl = `${currentUrl}#/portal/support/success`;
            const cancelUrl = currentUrl;
            const api = setupGhostApi({siteUrl});

            try {
                const response = await api.member.checkoutDonation({successUrl, cancelUrl});

                if (response.url) {
                    window.location.assign(response.url);
                }
            } catch (err) {
                const errorMessage = err.message || 'There was an error processing your payment. Please try again.';
                setLoading(false);
                setError(errorMessage);
            }
        }

        checkoutDonation();

    // Do it once
    // eslint-disable-next-line
    }, []);

    if (isLoading) {
        const title = `Loading checkout...`;
        return (
            <div>
                <h1 style={{textAlign: 'center'}}>{title}</h1>
                <LoadingPage />
            </div>
        );
    }

    if (error) {
        return <SupportError error={error} />;
    }

    return null;
};

export default SupportPage;
