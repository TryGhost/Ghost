import React from 'react';

export function Delayed({children, waitBeforeShow = 500}) {
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setShow(true);
        }, waitBeforeShow);

        return () => {
            clearTimeout(timeout);
        };
    }, [waitBeforeShow]);

    return show ? children : null;
}
