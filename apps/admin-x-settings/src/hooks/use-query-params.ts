import {useEffect, useState} from 'react';

const useQueryParams = () => {
    const [params, setParams] = useState(new URLSearchParams());

    useEffect(() => {
        const updateParams = () => {
            const hash = window.location.hash;
            const queryString = hash.split('?')[1];

            if (queryString) {
                setParams(new URLSearchParams(queryString));
            } else {
                setParams(new URLSearchParams());
            }
        };

        // Initialize
        updateParams();

        // Listen for hash changes
        window.addEventListener('hashchange', updateParams);

        // Cleanup
        return () => {
            window.removeEventListener('hashchange', updateParams);
        };
    }, []);

    const getParam = (key: string) => {
        return params.get(key);
    };

    return {
        getParam
    };
};

export default useQueryParams;
