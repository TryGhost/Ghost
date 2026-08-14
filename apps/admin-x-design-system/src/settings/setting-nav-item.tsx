import clsx from 'clsx';
import React, {forwardRef} from 'react';

export interface SettingNavItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'ref' | 'title' | 'onClick'> {
    title: React.ReactNode;
    navid?: string;
    icon?: React.ReactNode;
    isCurrent?: boolean;
    isVisible?: boolean;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SettingNavItem = forwardRef<HTMLLIElement, SettingNavItemProps>(function SettingNavItem({
    title,
    navid = '',
    icon,
    isCurrent = false,
    isVisible = true,
    onClick = () => {},
    ...props
}, ref) {
    const classNames = clsx(
        'mt-px flex h-[32px] w-100 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-control font-medium transition-all hover:bg-grey-200 focus:bg-grey-100 dark:text-grey-600 dark:hover:bg-grey-950 dark:focus:bg-grey-900 [&>svg]:size-4 [&>svg]:shrink-0',
        isCurrent ? 'bg-grey-200 text-black dark:bg-grey-950 dark:text-white' : 'text-grey-800',
        !isVisible && 'hidden'
    );

    return (
        <li ref={ref} {...props}><a className={classNames} id={navid} onClick={onClick}>
            {icon}
            {title}
        </a></li>
    );
});

export default SettingNavItem;
