import React from 'react';

export const LoadingIndicator: React.FC = () => {
    return (
        <div>
            Loading...
        </div>
    );
};

type CenteredLoadingIndicatorProps = {
    delay?: number;
    style?: React.CSSProperties;
};

export const CenteredLoadingIndicator: React.FC<CenteredLoadingIndicatorProps> = ({delay, style}) => {
    const [show, setShow] = React.useState(!delay);

    React.useEffect(() => {
        if (delay) {
            const timeout = setTimeout(() => {
                setShow(true);
            }, delay);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [delay]);

    return (
        <div className={`flex h-64 items-center justify-center transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`} style={style}>
            <LoadingIndicator />
        </div>
    );
};
