import * as React from 'react';

const MOBILE_BREAKPOINT = 801;

function getIsMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile());

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(getIsMobile());
        };
        mql.addEventListener('change', onChange);
        setIsMobile(getIsMobile());
        return () => mql.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}
