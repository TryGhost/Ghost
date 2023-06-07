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
    let footerContainerBottom = shiftY || '0';

    let footerContainerClasses = clsx(
        'w-100 sticky z-[100] mb-[-24px]',
        `after:sticky after:bottom-[22px] after:mx-2 after:block after:h-[22px] after:rounded-full after:shadow-[0_0_0_1px_rgba(0,0,0,.025),0_-8px_16px_-3px_rgba(0,0,0,.08)] after:content-['']`,
        containerClasses
    );

    let footerClasses = clsx(
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
        </div>
    );
};

export default StickyFooter;