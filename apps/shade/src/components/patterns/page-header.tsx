import {DropdownMenu, DropdownMenuContent, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {H1} from '@/components/layout/heading';
import {Inline, Stack, Text} from '@/components/primitives';
import {cn} from '@/lib/utils';

import React from 'react';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

type PageHeaderProps = PropsWithChildrenAndClassName & {
    sticky?: boolean;
    blurredBackground?: boolean;
};

// ---------------------------------------------------------------------------
// Title-block primitives
// ---------------------------------------------------------------------------

function PageHeaderBreadcrumb({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('text-sm text-muted-foreground pt-1', className)}
            data-page-header='breadcrumb'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

function PageHeaderCount({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Text
            as='span'
            className={cn('ml-2 lg:ml-3 text-[1.9rem] sidebar:text-[2.2rem] tabular-nums', className)}
            data-page-header='count'
            tone='secondary'
            weight='regular'
        >
            {children}
        </Text>
    );
}

function PageHeaderDescription({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Text
            as='p'
            className={className}
            data-page-header='description'
            size='sm'
            tone='secondary'
        >
            {children}
        </Text>
    );
}

function PageHeaderMeta({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Text
            as='p'
            className={cn('mt-0.5', className)}
            data-page-header='meta'
            size='sm'
            tone='secondary'
        >
            {children}
        </Text>
    );
}

/**
 * `Title` accepts heading text plus optional `Count`, `Description`, and `Meta`
 * children. `Count` flows inline inside the H1; `Description` and `Meta` stack
 * below the heading.
 */
function PageHeaderTitle({className, children}: PropsWithChildrenAndClassName) {
    const headingChildren: React.ReactNode[] = [];
    const subTextChildren: React.ReactNode[] = [];

    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) {
            headingChildren.push(child);
            return;
        }

        switch (child.type) {
        case PageHeaderDescription:
        case PageHeaderMeta:
            subTextChildren.push(child);
            break;
        default:
            headingChildren.push(child);
        }
    });

    const heading = (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] sidebar:text-[2.5rem] whitespace-nowrap',
                className
            )}
            data-page-header='title'
        >
            {headingChildren}
        </H1>
    );

    if (subTextChildren.length > 0) {
        return (
            <Stack data-page-header='title-body' gap='none'>
                {heading}
                {subTextChildren}
            </Stack>
        );
    }

    return heading;
}

// ---------------------------------------------------------------------------
// Main row — Left (stack: Breadcrumb + Title) + Actions
// ---------------------------------------------------------------------------

function PageHeaderLeft({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Stack
            className={cn('min-w-0 h-full min-h-(--control-height)', className)}
            data-page-header='left'
            gap='xs'
            justify='center'
        >
            {children}
        </Stack>
    );
}

type PageHeaderActionGroupPrimaryProps = React.PropsWithChildren;
function PageHeaderActionGroupPrimary({children}: PageHeaderActionGroupPrimaryProps) {
    return <>{children}</>;
}

type PageHeaderActionGroupMobileMenuProps = React.PropsWithChildren;
function PageHeaderActionGroupMobileMenu({children}: PageHeaderActionGroupMobileMenuProps) {
    return <DropdownMenu>{children}</DropdownMenu>;
}

type PageHeaderActionGroupMobileMenuTriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger>;
function PageHeaderActionGroupMobileMenuTrigger({children, ...props}: PageHeaderActionGroupMobileMenuTriggerProps) {
    return (
        <DropdownMenuTrigger asChild {...props}>
            {children}
        </DropdownMenuTrigger>
    );
}

type PageHeaderActionGroupMobileMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;
function PageHeaderActionGroupMobileMenuContent({children, ...props}: PageHeaderActionGroupMobileMenuContentProps) {
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

type PageHeaderActionGroupProps = PropsWithChildrenAndClassName & {
    mobileMenuBreakpoint?: number;
};
type PageHeaderActionGroupComponent = React.FC<PageHeaderActionGroupProps> & {
    Primary: React.FC<PageHeaderActionGroupPrimaryProps>;
    MobileMenu: React.FC<PageHeaderActionGroupMobileMenuProps>;
    MobileMenuTrigger: React.FC<PageHeaderActionGroupMobileMenuTriggerProps>;
    MobileMenuContent: React.FC<PageHeaderActionGroupMobileMenuContentProps>;
};

const PageHeaderActionGroup: PageHeaderActionGroupComponent = Object.assign(
    function PageHeaderActionGroup({className, children, mobileMenuBreakpoint = DEFAULT_MOBILE_MENU_BREAKPOINT}: PageHeaderActionGroupProps) {
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

            if (childElement.type === PageHeaderActionGroupMobileMenu) {
                mobileMenu = childElement;
                return;
            }

            if (childElement.type === PageHeaderActionGroupPrimary) {
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
                    data-page-header='action-group'
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
                    data-page-header='action-group'
                    gap='sm'
                    justify='end'
                >
                    <Inline
                        align='center'
                        data-page-header='action-group-desktop'
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
                data-page-header='action-group'
                gap='sm'
                justify='end'
            >
                <Inline
                    align='center'
                    className='ml-auto'
                    data-page-header='action-group-mobile'
                    gap='sm'
                >
                    {mobileMenu}
                    {primaryAction && (
                        <div data-page-header='action-group-mobile-primary'>
                            {primaryAction}
                        </div>
                    )}
                </Inline>
            </Inline>
        );
    },
    {
        Primary: PageHeaderActionGroupPrimary,
        MobileMenu: PageHeaderActionGroupMobileMenu,
        MobileMenuTrigger: PageHeaderActionGroupMobileMenuTrigger,
        MobileMenuContent: PageHeaderActionGroupMobileMenuContent
    }
);

function PageHeaderActions({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('shrink-0 min-h-(--control-height)', className)}
            data-page-header='actions'
            gap='lg'
        >
            {children}
        </Inline>
    );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

type PageHeaderComponent = React.FC<PageHeaderProps> & {
    Left: React.FC<PropsWithChildrenAndClassName>;
    Breadcrumb: React.FC<PropsWithChildrenAndClassName>;
    Title: React.FC<PropsWithChildrenAndClassName>;
    Count: React.FC<PropsWithChildrenAndClassName>;
    Description: React.FC<PropsWithChildrenAndClassName>;
    Meta: React.FC<PropsWithChildrenAndClassName>;
    Actions: React.FC<PropsWithChildrenAndClassName>;
    ActionGroup: PageHeaderActionGroupComponent;
};

/**
 * PageHeader is the canonical page-chrome component for Ghost Admin pages.
 *
 * Structure (a vertical stack of three rows; any row collapses if its slots
 * are absent):
 *
 *   1. Main row — `Inline align=start justify=between`:
 *        `Left` (stack: `Breadcrumb` + `Title`) | `Actions`
 *   2. View row — `Inline align=center justify=between`:
 *        `ViewBar` | `ViewActions`
 *   3. Filter bar — plain container.
 *
 * `Title` accepts an inline `Count` and stacked `Description`/`Meta` children.
 */
const PageHeader: PageHeaderComponent = Object.assign(
    function PageHeader({className, children, sticky = true, blurredBackground = true}: PageHeaderProps) {
        return (
            <header
                className={cn(
                    'flex flex-col',
                    sticky && 'sticky top-0 z-50',
                    blurredBackground && 'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                    className
                )}
                data-page-header='page-header'
            >
                <Inline
                    align='start'
                    className='w-full'
                    data-page-header='main'
                    gap='lg'
                    justify='between'
                >
                    {children}
                </Inline>
            </header>
        );
    },
    {
        Left: PageHeaderLeft,
        Breadcrumb: PageHeaderBreadcrumb,
        Title: PageHeaderTitle,
        Count: PageHeaderCount,
        Description: PageHeaderDescription,
        Meta: PageHeaderMeta,
        Actions: PageHeaderActions,
        ActionGroup: PageHeaderActionGroup
    }
);

export {
    PageHeader,
    PageHeaderLeft,
    PageHeaderBreadcrumb,
    PageHeaderTitle,
    PageHeaderCount,
    PageHeaderDescription,
    PageHeaderMeta,
    PageHeaderActions,
    PageHeaderActionGroup,
    PageHeaderActionGroupPrimary,
    PageHeaderActionGroupMobileMenu,
    PageHeaderActionGroupMobileMenuTrigger,
    PageHeaderActionGroupMobileMenuContent
};
