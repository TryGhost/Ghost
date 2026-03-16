import React from 'react';

export function Delayed({children, waitBeforeShow = 500}) {
    const [show, setShow] = React.useState(waitBeforeShow === 0);

    React.useEffect(() => {
        if (show) {
            return;
        }

        const timeout = setTimeout(() => {
            setShow(true);
        }, waitBeforeShow);

        return () => {
            clearTimeout(timeout);
        };
    }, [show, waitBeforeShow]);

    return show ? children : null;
}
