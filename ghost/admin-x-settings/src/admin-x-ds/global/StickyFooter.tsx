import React from 'react';
import clsx from 'clsx';

interface StickyFooterProps {
    shiftY?: string;
    footerBgColorClass?: string;
    contentBgColorClass?: string;
    height?: number;
    children?: React.ReactNode;
}

const StickyFooter: React.FC<StickyFooterProps> = ({
    shiftY,
    footerBgColorClass = 'bg-white',
    contentBgColorClass = 'bg-white',
    height = 96,
    children
}) => {
    const containerClasses = clsx(
        'w-100 sticky bottom-[-24px] z-[9997] m-0 box-border p-0'
    );
    const containerBottom = shiftY ? `calc(${shiftY} - 24px)` : '-24px';
    const containerHeight = `${height + 24}px`;

    const coverClasses = clsx(
        'sticky z-[9998] block h-[24px]',
        contentBgColorClass
    );
    const coverBottom = '0';

    const contentClasses = clsx(
        `sticky z-[9999] mb-[-24px] flex items-center justify-between`,
        // 'min-h-[48px]',
        'h-[96px]',
        footerBgColorClass
    );
    const contentBottom = '0';
    const contentHeight = `${height}px`;

    const shadowClasses = `sticky mx-2 block h-[24px] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.025),0_-8px_16px_-3px_rgba(0,0,0,.08)]`;
    const shadowBottom = shiftY ? `calc(${shiftY} + ${height - 24}px)` : `${height - 24}px`;

    return (
        <div className={containerClasses}
            style={{
                bottom: containerBottom,
                height: containerHeight
            }}
        >
            <div className={coverClasses}
                style={{
                    bottom: coverBottom
                }}
            ></div>
            <div className={contentClasses}
                style={{
                    bottom: contentBottom,
                    height: contentHeight
                }}
            >
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