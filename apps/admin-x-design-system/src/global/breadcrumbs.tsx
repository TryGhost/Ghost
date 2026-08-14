import clsx from 'clsx';
import React from 'react';
import Button from './button';

export type BreadcrumbItem = {
    key?: React.Key;
    label: React.ReactNode;
    onClick?: () => void;
}

export interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    backIcon?: boolean;
    snapBackIcon?: boolean;
    onBack?: () => void;
    containerClassName?: string;
    itemClassName?: string;
    activeItemClassName?: string;
    separatorClassName?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    items,
    backIcon = false,
    snapBackIcon = true,
    onBack,
    containerClassName,
    itemClassName,
    activeItemClassName,
    separatorClassName
}) => {
    const allItems = items.length;

    containerClassName = clsx(
        'flex items-center gap-2',
        containerClassName
    );

    activeItemClassName = clsx(
        'font-bold',
        activeItemClassName
    );

    itemClassName = clsx(
        itemClassName
    );

    return (
        <div className={containerClassName}>
            {backIcon &&
            <Button className={snapBackIcon ? 'mr-1' : 'mr-6'} icon='arrow-left' iconColorClass='dark:text-white' size='sm' link onClick={onBack} />
            }
            {items.map((item, index) => {
                const itemKey = item.key ?? String(item.label);

                if (index === allItems - 1) {
                    return <span key={itemKey} className={activeItemClassName}>{item.label}</span>;
                }

                return (
                    <React.Fragment key={itemKey}>
                        <button
                            className={`${itemClassName} ${item.onClick && '-mx-1 cursor-pointer rounded-sm px-1 py-px hover:bg-grey-100 dark:hover:bg-grey-900'}`}
                            type="button"
                            onClick={item.onClick}
                        >
                            {item.label}
                        </button>
                        <span className={separatorClassName}>/</span>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumbs;
