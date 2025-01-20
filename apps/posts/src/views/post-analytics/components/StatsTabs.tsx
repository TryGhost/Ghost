import * as React from 'react';
import {Button, ButtonProps} from '@tryghost/shade';
import {cn} from '@tryghost/shade';

interface statsTabsProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const StatsTabs: React.FC<statsTabsProps> = ({className, ...props}) => {
    return <div className={cn('flex flex-col gap-8', className)} {...props} />;
};

interface statsTabsGroupProps
    extends React.HTMLAttributes<HTMLDivElement> {};

const StatsTabsGroup: React.FC<statsTabsGroupProps> = ({className, ...props}) => {
    return <div className={cn('flex flex-col gap-2', className)} {...props} />;
};

interface subNavItemProps extends ButtonProps {
    isActive?: boolean;
}

const StatsTabItem: React.FC<subNavItemProps> = ({isActive, ...props}) => {
    const subNavItemClasses = cn(
        'flex flex-col items-start h-auto py-3 gap-0 border border-border group/item',
        isActive ? 'bg-muted/70' : 'border-gray-200 hover:bg-muted/50'
    );
    return (
        <Button
            className={subNavItemClasses}
            data-state={isActive ? 'active' : 'inactive'}
            variant='ghost' {...props}
        />
    );
};

interface statsTabTitleProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const StatsTabTitle: React.FC<statsTabTitleProps> = ({className, ...props}) => {
    return <div className={cn('min-h-5 w-full font-medium flex justify-between items-start text-gray-600 group-data-[state=active]/item:text-gray-800 gap-2', className)} {...props} />;
};

interface statsTabValueProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const StatsTabValue: React.FC<statsTabValueProps> = ({className, ...props}) => {
    return <div className={cn('text-2xl text-black tracking-tight font-semibold -mt-1', className)} {...props} />;
};

export {
    StatsTabs,
    StatsTabsGroup,
    StatsTabItem,
    StatsTabTitle,
    StatsTabValue
};
