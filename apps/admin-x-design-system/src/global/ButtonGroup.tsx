import React from 'react';
import Button, {ButtonSize} from './Button';

import {ButtonProps} from './Button';
import clsx from 'clsx';

export interface ButtonGroupProps {
    size?: ButtonSize;
    buttons: Array<ButtonProps>;
    link?: boolean;
    linkWithPadding?: boolean;
    clearBg?: boolean;
    outlineOnMobile?: boolean;
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({size = 'md', buttons, link, linkWithPadding, clearBg = true, outlineOnMobile, className}) => {
    let groupColorClasses = clsx(
        'flex items-center justify-start rounded',
        link ? 'gap-4' : 'gap-2',
        className
    );

    if (link && !clearBg) {
        groupColorClasses = clsx(
            'transition-all hover:bg-grey-200 dark:hover:bg-grey-900',
            size === 'sm' ? 'h-7 px-3' : 'h-[34px] px-4',
            outlineOnMobile && 'border border-grey-300 hover:border-transparent md:border-transparent',
            groupColorClasses
        );
    }

    return (
        <div className={groupColorClasses}>
            {buttons.map(({key, ...props}) => (
                <Button key={key} link={link} linkWithPadding={linkWithPadding} size={size} {...props} />
            ))}
        </div>
    );
};

export default ButtonGroup;
