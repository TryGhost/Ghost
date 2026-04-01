import {H1} from './heading';
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';

import React from 'react';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

type ListHeaderProps = PropsWithChildrenAndClassName & {
    sticky?: boolean;
    blurredBackground?: boolean;
};

function ListHeaderLeft({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex min-w-0 flex-col gap-1 h-full min-h-[34px] justify-center', className)}
            data-list-header='list-header-left'
        >
            {children}
        </div>
    );
}

function ListHeaderBreadcrumb({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
            data-list-header='list-header-breadcrumb'
        >
            {children}
        </div>
    );
}

function ListHeaderTitle({className, children}: PropsWithChildrenAndClassName) {
    return (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] sidebar:text-[2.5rem] whitespace-nowrap',
                className
            )}
            data-list-header='list-header-title'
        >
            {children}
        </H1>
    );
}

function ListHeaderDescription({className, children}: PropsWithChildrenAndClassName) {
    return (
        <p
            className={cn('text-sm text-muted-foreground', className)}
            data-list-header='list-header-description'
        >
            {children}
        </p>
    );
}

function ListHeaderCount({className, children}: PropsWithChildrenAndClassName) {
    return (
        <span
            className={cn('ml-2 lg:ml-3 font-normal text-[1.9rem] sidebar:text-[2.2rem] text-muted-foreground tabular-nums', className)}
            data-list-header='list-header-count'
        >
            {children}
        </span>
    );
}

type ListHeaderActionGroupPrimaryProps = React.PropsWithChildren;
function ListHeaderActionGroupPrimary({children}: ListHeaderActionGroupPrimaryProps) {
    return <>{children}</>;
}

type ListHeaderActionGroupMobileMenuProps = React.PropsWithChildren;
function ListHeaderActionGroupMobileMenu({children}: ListHeaderActionGroupMobileMenuProps) {
    return <DropdownMenu>{children}</DropdownMenu>;
}

type ListHeaderActionGroupMobileMenuTriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger>;
function ListHeaderActionGroupMobileMenuTrigger({children, ...props}: ListHeaderActionGroupMobileMenuTriggerProps) {
    return (
        <DropdownMenuTrigger asChild {...props}>
            {children}
        </DropdownMenuTrigger>
    );
}

type ListHeaderActionGroupMobileMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
function ListHeaderActionGroupMobileMenuContent({children, ...props}: ListHeaderActionGroupMobileMenuContentProps) {
    return (
        <DropdownMenuContent align='end' sideOffset={8} {...props}>
            {children}
        </DropdownMenuContent>
    );
}

const DEFAULT_MOBILE_MENU_BREAKPOINT = 640;

const isBelowBreakpoint = (breakpoint: number) => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.innerWidth < breakpoint;
};

const useShouldCollapseActionGroup = (breakpoint: number) => {
    const [shouldCollapse, setShouldCollapse] = React.useState(() => isBelowBreakpoint(breakpoint));

    React.useEffect(() => {
        const onResize = () => {
            setShouldCollapse(isBelowBreakpoint(breakpoint));
        };

        onResize();
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, [breakpoint]);

    return shouldCollapse;
};

type ListHeaderActionGroupProps = PropsWithChildrenAndClassName & {
    mobileMenuBreakpoint?: number;
};
type ListHeaderActionGroupComponent = React.FC<ListHeaderActionGroupProps> & {
    Primary: React.FC<ListHeaderActionGroupPrimaryProps>;
    MobileMenu: React.FC<ListHeaderActionGroupMobileMenuProps>;
    MobileMenuTrigger: React.FC<ListHeaderActionGroupMobileMenuTriggerProps>;
    MobileMenuContent: React.FC<ListHeaderActionGroupMobileMenuContentProps>;
};

const ListHeaderActionGroup: ListHeaderActionGroupComponent = Object.assign(
    function ListHeaderActionGroup({className, children, mobileMenuBreakpoint = DEFAULT_MOBILE_MENU_BREAKPOINT}: ListHeaderActionGroupProps) {
        const childNodes = React.Children.toArray(children);
        const desktopChildren: React.ReactNode[] = [];
        let mobileMenu: React.ReactElement | null = null;
        let primaryAction: React.ReactNode = null;
        const shouldCollapse = useShouldCollapseActionGroup(mobileMenuBreakpoint);

        childNodes.forEach((child) => {
            if (!React.isValidElement(child)) {
                desktopChildren.push(child);
                return;
            }

            const childElement = child as React.ReactElement<{children?: React.ReactNode}>;

            if (childElement.type === ListHeaderActionGroupMobileMenu) {
                mobileMenu = childElement;
                return;
            }

            if (childElement.type === ListHeaderActionGroupPrimary) {
                primaryAction = childElement.props.children ?? null;
                desktopChildren.push(childElement.props.children ?? null);
                return;
            }

            desktopChildren.push(childElement);
        });

        if (!mobileMenu) {
            return (
                <div
                    className={cn('flex items-center justify-end gap-2', className)}
                    data-list-header='list-header-action-group'
                >
                    {children}
                </div>
            );
        }

        if (!shouldCollapse) {
            return (
                <div
                    className={cn('flex items-center justify-end gap-2', className)}
                    data-list-header='list-header-action-group'
                >
                    <div
                        className='flex items-center justify-end gap-2'
                        data-list-header='list-header-action-group-desktop'
                    >
                        {desktopChildren}
                    </div>
                </div>
            );
        }

        return (
            <div
                className={cn('flex items-center justify-end gap-2', className)}
                data-list-header='list-header-action-group'
            >
                <div
                    className='ml-auto flex items-center gap-2'
                    data-list-header='list-header-action-group-mobile'
                >
                    {mobileMenu}
                    {primaryAction && (
                        <div data-list-header='list-header-action-group-mobile-primary'>
                            {primaryAction}
                        </div>
                    )}
                </div>
            </div>
        );
    },
    {
        Primary: ListHeaderActionGroupPrimary,
        MobileMenu: ListHeaderActionGroupMobileMenu,
        MobileMenuTrigger: ListHeaderActionGroupMobileMenuTrigger,
        MobileMenuContent: ListHeaderActionGroupMobileMenuContent
    }
);

function ListHeaderActions({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex shrink-0 items-center gap-4', className)}
            data-list-header='list-header-actions'
        >
            {children}
        </div>
    );
}

type ListHeaderComponent = React.FC<ListHeaderProps> & {
    Left: React.FC<PropsWithChildrenAndClassName>;
    Breadcrumb: React.FC<PropsWithChildrenAndClassName>;
    Title: React.FC<PropsWithChildrenAndClassName>;
    Count: React.FC<PropsWithChildrenAndClassName>;
    Description: React.FC<PropsWithChildrenAndClassName>;
    Actions: React.FC<PropsWithChildrenAndClassName>;
    ActionGroup: ListHeaderActionGroupComponent;
};

const ListHeader: ListHeaderComponent = Object.assign(
    function ListHeader({className, children, sticky = true, blurredBackground = true}: ListHeaderProps) {
        return (
            <header
                className={cn(
                    'flex items-start justify-between gap-4 px-4 lg:px-8',
                    sticky && 'sticky top-0 z-50 -mb-4 lg:-mb-4',
                    blurredBackground && 'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                    className
                )}
                data-list-header='list-header'
            >
                {children}
            </header>
        );
    },
    {
        Left: ListHeaderLeft,
        Breadcrumb: ListHeaderBreadcrumb,
        Title: ListHeaderTitle,
        Count: ListHeaderCount,
        Description: ListHeaderDescription,
        Actions: ListHeaderActions,
        ActionGroup: ListHeaderActionGroup
    }
);

export {
    ListHeader,
    ListHeaderLeft,
    ListHeaderBreadcrumb,
    ListHeaderActions,
    ListHeaderActionGroup,
    ListHeaderActionGroupPrimary,
    ListHeaderActionGroupMobileMenu,
    ListHeaderActionGroupMobileMenuTrigger,
    ListHeaderActionGroupMobileMenuContent,
    ListHeaderTitle,
    ListHeaderCount,
    ListHeaderDescription
};
