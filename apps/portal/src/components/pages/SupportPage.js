import {useEffect, useState} from 'react';
import SupportError from './SupportError';
import LoadingPage from './LoadingPage';
import setupGhostApi from '../../utils/api';

const SupportPage = () => {
    const [isLoading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [disabledFeatureError, setDisabledFeatureError] = useState(null);

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
                    window.location.replace(response.url);
                }
            } catch (err) {
                if (err.type && err.type === 'DisabledFeatureError') {
                    setDisabledFeatureError('This site is not accepting payments at the moment.');
                } else {
                    setError('Something went wrong, please try again later.');
                }

                setLoading(false);
            }
        }

        checkoutDonation();

    // Do it once
    // eslint-disable-next-line
    }, []);

    if (isLoading) {
        return (
            <div>
                <LoadingPage />
            </div>
        );
    }

    if (error) {
        return <SupportError error={error} />;
    }

    if (disabledFeatureError) {
        // TODO: use a different layout for this error
        return <SupportError error={disabledFeatureError} />;
    }

    return null;
};

export default SupportPage;
