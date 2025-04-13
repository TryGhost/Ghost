import clsx from 'clsx';
import React, {forwardRef} from 'react';
import Icon from '../global/Icon';

export interface SettingNavItemProps extends Omit<React.HTMLProps<HTMLLIElement>, 'ref' | 'title' | 'onClick'> {
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
        'w-100 mt-px flex h-[36px] cursor-pointer items-center rounded-md px-3 py-2 text-left text-[14px] font-medium transition-all hover:bg-grey-200 focus:bg-grey-100 dark:text-grey-600 dark:hover:bg-grey-950 dark:focus:bg-grey-925',
        isCurrent ? 'bg-grey-200 text-black dark:bg-grey-950 dark:text-white' : 'text-grey-800',
        !isVisible && 'hidden'
    );

    return (
        <li ref={ref} {...props}><a className={classNames} id={navid} onClick={onClick}>
            {icon && <Icon className='mr-[7px] h-[16px] w-[16px]' name={icon} size='custom' />}
            {title}
        </a></li>
    );
});

export default SettingNavItem;
