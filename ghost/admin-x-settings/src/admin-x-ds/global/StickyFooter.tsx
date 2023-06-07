import React from 'react';
import clsx from 'clsx';

interface StickyFooterProps {
    shiftY?: string;
    bgTWColor: string;
    children?: React.ReactNode;

    containerClasses?: string;
    contentClasses?: string;
}

const StickyFooter: React.FC<StickyFooterProps> = ({shiftY, bgTWColor = 'white', children, containerClasses, contentClasses}) => {
    const footerContainerBottom = shiftY ? `calc(${shiftY})` : '0';
    const shadowBottom = shiftY ? `calc(${shiftY} + 72px)` : '72px';

    const footerContainerClasses = clsx(
        'w-100 sticky z-[100]',
        containerClasses
    );

    const shadowClasses = `sticky bottom-[72px] mx-2 block h-[22px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.025),0_-8px_16px_-3px_rgba(0,0,0,.08)]`;

    const footerClasses = clsx(
        `bg-${bgTWColor} sticky z-[101] mb-[-24px] flex min-h-[48px] items-center justify-between`,
        contentClasses
    );

    return (
        <div className={footerContainerClasses} style={{
            bottom: footerContainerBottom
        }}>
            <div className={footerClasses}>
                {children}
            </div>
            <div className={shadowClasses}
                style={{
                    bottom: shadowBottom
                }}
            ></div>
        </div>
    );
};

export default StickyFooter;