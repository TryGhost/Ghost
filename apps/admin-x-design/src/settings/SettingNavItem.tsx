import clsx from 'clsx';
import React, {forwardRef} from 'react';
import Icon from '../global/Icon';

// TODO: Wrap with removed logic in admin-x-settings

export interface SettingNavItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'title' | 'onClick'> {
    title: React.ReactNode;
    navid?: string;
    icon?: string;
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
        'w-100 flex h-8 cursor-pointer items-center rounded-md px-2 py-1 text-left text-sm transition-all hover:bg-grey-100 focus:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-925 dark:focus:bg-grey-900',
        isCurrent && 'bg-grey-200 dark:bg-grey-900',
        !isVisible && 'hidden'
    );

    return (
        <li ref={ref} {...props}><a className={classNames} id={navid} onClick={onClick}>
            {icon && <Icon className='mr-[7px]' name={icon} size='sm' />}
            {title}
        </a></li>
    );
});

export default SettingNavItem;
