import React from 'react';
import clsx from 'clsx';

interface StickyFooterProps {
    shiftY?: string;
    children?: React.ReactNode;
}

const BlurryStickyFooter: React.FC<StickyFooterProps> = ({
    shiftY,
    children
}) => {
    const containerClasses = clsx(
        'w-100 sticky z-[9997] m-0 box-border p-0',
        'backdrop-blur',
        'bg-[rgba(255,255,255,0.4)]'
    );
    const containerBottom = shiftY ? `calc(${shiftY})` : '0';
    const containerHeight = `82px`;

    const contentClasses = clsx(
        `sticky z-[9999] flex items-center justify-between`,
        'h-[96px]'
    );
    const contentBottom = '0';
    const contentHeight = `82px`;

    return (
        <>
            <div className={containerClasses}
                style={{
                    bottom: containerBottom,
                    height: containerHeight
                }}
            >
                <div className={contentClasses}
                    style={{
                        bottom: contentBottom,
                        height: contentHeight
                    }}
                >
                    {children}
                </div>
            </div>
        </>
    );
};

export default BlurryStickyFooter;