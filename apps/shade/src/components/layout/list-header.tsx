import {H1} from './heading';
import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Inline, Stack, Text} from '@/components/primitives';
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
        <Stack
            className={cn('min-w-0 h-full min-h-(--control-height)', className)}
            data-list-header='list-header-left'
            gap='xs'
            justify='center'
        >
            {children}
        </Stack>
    );
}

function ListHeaderBreadcrumb({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('text-sm text-muted-foreground', className)}
            data-list-header='list-header-breadcrumb'
            gap='sm'
        >
            {children}
        </Inline>
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
        <Text
            as='p'
            className={className}
            data-list-header='list-header-description'
            size='sm'
            tone='secondary'
        >
            {children}
        </Text>
    );
}

function ListHeaderCount({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Text
            as='span'
            className={cn('ml-2 lg:ml-3 text-[1.9rem] sidebar:text-[2.2rem] tabular-nums', className)}
            data-list-header='list-header-count'
            tone='secondary'
            weight='regular'
        >
            {children}
        </Text>
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
                <Inline
                    align='center'
                    className={className}
                    data-list-header='list-header-action-group'
                    gap='sm'
                    justify='end'
                >
                    {children}
                </Inline>
            );
        }

        if (!shouldCollapse) {
            return (
                <Inline
                    align='center'
                    className={className}
                    data-list-header='list-header-action-group'
                    gap='sm'
                    justify='end'
                >
                    <Inline
                        align='center'
                        data-list-header='list-header-action-group-desktop'
                        gap='sm'
                        justify='end'
                    >
                        {desktopChildren}
                    </Inline>
                </Inline>
            );
        }

        return (
            <Inline
                align='center'
                className={className}
                data-list-header='list-header-action-group'
                gap='sm'
                justify='end'
            >
                <Inline
                    align='center'
                    className='ml-auto'
                    data-list-header='list-header-action-group-mobile'
                    gap='sm'
                >
                    {mobileMenu}
                    {primaryAction && (
                        <div data-list-header='list-header-action-group-mobile-primary'>
                            {primaryAction}
                        </div>
                    )}
                </Inline>
            </Inline>
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
        <Inline
            align='center'
            className={cn('shrink-0', className)}
            data-list-header='list-header-actions'
            gap='lg'
        >
            {children}
        </Inline>
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

/**
 * @deprecated Prefer composing list header shells directly from `Inline`, `Stack`, `Grid`, and `Text` primitives.
 */
const ListHeader: ListHeaderComponent = Object.assign(
    function ListHeader({className, children, sticky = true, blurredBackground = true}: ListHeaderProps) {
        return (
            <Inline
                align='start'
                as='header'
                className={cn(
                    'px-4 lg:px-8',
                    sticky && 'sticky top-0 z-50 -mb-4 lg:-mb-4',
                    blurredBackground && 'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                    className
                )}
                data-list-header='list-header'
                gap='lg'
                justify='between'
            >
                {children}
            </Inline>
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
