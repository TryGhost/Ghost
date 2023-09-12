import React from 'react';

export const LoadingIndicator: React.FC = () => {
    return (
        <div>
            <div className="relative mx-0 my-[-0.5] box-border inline-block h-[50px] w-[50px] animate-spin rounded-full border border-[rgba(0,0,0,0.1)] before:z-10 before:mt-[7px] before:block before:h-[7px] before:w-[7px] before:rounded-full before:bg-[#4C5156] before:content-['']"></div>
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
