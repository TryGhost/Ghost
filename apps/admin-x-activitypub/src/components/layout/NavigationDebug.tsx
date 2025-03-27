import React, {useEffect} from 'react';
import {useLocation, useNavigationStack} from '@tryghost/admin-x-framework';

const NavigationDebug: React.FC = () => {
    const location = useLocation();
    const {stack: navigationStack, canGoBack, previousPath} = useNavigationStack();

    useEffect(() => {
        // console.group('Navigation Event');
        // console.log('Current Location:', location.pathname);
        // console.log('Navigation Stack:', navigationStack);
        // console.log('Can Go Back:', canGoBack);
        // console.log('Previous Path:', previousPath);
        // console.log('Browser History Length:', window.history.length);
        // console.groupEnd();
    }, [location, navigationStack, canGoBack, previousPath]);

    return null;
};

export default NavigationDebug;
