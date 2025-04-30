import React from 'react';
import Button, {ButtonSize} from './Button';
import Tooltip from './Tooltip';

import {ButtonProps} from './Button';
import clsx from 'clsx';

export interface ButtonGroupButtonProps extends ButtonProps {
    tooltip?: string | React.ReactNode;
}

export interface ButtonGroupProps {
    size?: ButtonSize;
    buttons: Array<ButtonGroupButtonProps>;
    link?: boolean;
    linkWithPadding?: boolean;
    clearBg?: boolean;
    outlineOnMobile?: boolean;
    className?: string;
    activeKey?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({size = 'md', buttons, link, linkWithPadding, clearBg = true, outlineOnMobile, className, activeKey}) => {
    let groupColorClasses = clsx(
        'flex items-center justify-start rounded',
        link ? 'gap-4' : 'gap-2',
        !link && !clearBg && '!gap-0 rounded-lg bg-grey-100 dark:bg-grey-900',
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
            {buttons.map(({key, ...props}) => {
                const buttonProps = {...props};

                if (!link && !clearBg) {
                    buttonProps.className = clsx(props.className, 'w-8 rounded-lg border !px-0');

                    if (key === activeKey) {
                        buttonProps.color = 'white';
                        buttonProps.className = clsx(buttonProps.className, 'border-grey-300 shadow-xs dark:border-grey-800');
                    } else {
                        buttonProps.className = clsx(buttonProps.className, 'border-transparent');
                    }
                }

                return (
                    (props.tooltip ? 
                        <Tooltip key={key} content={props.tooltip}>
                            <Button key={`btn-${key}`} link={link} linkWithPadding={linkWithPadding} size={size} {...buttonProps} />
                        </Tooltip> :
                        <Button key={key} link={link} linkWithPadding={linkWithPadding} size={size} {...buttonProps} />
                    )
                );
            })}
        </div>
    );
};

export default ButtonGroup;
