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
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({size = 'md', buttons, link, linkWithPadding, clearBg = true, className}) => {
    let groupColorClasses = clsx(
        'flex items-center justify-start rounded',
        link ? 'gap-4' : 'gap-5',
        className
    );

    if (link && !clearBg) {
        groupColorClasses = clsx(
            'transition-all hover:bg-grey-200 dark:hover:bg-grey-900',
            size === 'sm' ? 'h-7 px-3' : 'h-[34px] px-4',
            groupColorClasses
        );
    }

    return (
        <div className={groupColorClasses}>
            {buttons.map(({key, ...props}) => (
                <Button key={key} link={link} linkWithPadding={linkWithPadding} {...props} />
            ))}
        </div>
    );
};

export default ButtonGroup;
