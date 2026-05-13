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

function PageHeaderBreadcrumb({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('text-sm text-muted-foreground', className)}
            data-page-header='breadcrumb'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

function PageHeaderContextStrip({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('text-sm text-muted-foreground', className)}
            data-page-header='context-strip'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

function PageHeaderTopRow({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('w-full', className)}
            data-page-header='top-row'
            gap='lg'
            justify='between'
        >
            {children}
        </Inline>
    );
}

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

function PageHeaderTitle({className, children}: PropsWithChildrenAndClassName) {
    return (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] sidebar:text-[2.5rem] whitespace-nowrap',
                className
            )}
            data-page-header='title'
        >
            {children}
        </H1>
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

type PageHeaderHeroImageProps = React.ImgHTMLAttributes<HTMLDivElement> & {
    src: string;
    className?: string;
};

function PageHeaderHeroImage({src, className, ...rest}: PageHeaderHeroImageProps) {
    return (
        <div
            className={cn(
                'aspect-[16/10] w-full max-w-[100px] rounded-md bg-cover bg-center md:max-w-[132px] shrink-0',
                className
            )}
            data-page-header='hero-image'
            role='img'
            style={{backgroundImage: `url(${src})`}}
            {...rest}
        />
    );
}

function PageHeaderHeroBody({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div className={cn('min-w-0', className)} data-page-header='hero-body'>
            {children}
        </div>
    );
}

function PageHeaderHero({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='start'
            className={cn('w-full md:items-center', className)}
            data-page-header='hero'
            gap='lg'
        >
            {children}
        </Inline>
    );
}

function PageHeaderNav({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div className={cn('w-full', className)} data-page-header='nav'>
            {children}
        </div>
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
            className={cn('shrink-0', className)}
            data-page-header='actions'
            gap='lg'
        >
            {children}
        </Inline>
    );
}

type PageHeaderComponent = React.FC<PageHeaderProps> & {
    TopRow: React.FC<PropsWithChildrenAndClassName>;
    Breadcrumb: React.FC<PropsWithChildrenAndClassName>;
    ContextStrip: React.FC<PropsWithChildrenAndClassName>;
    Left: React.FC<PropsWithChildrenAndClassName>;
    Title: React.FC<PropsWithChildrenAndClassName>;
    Count: React.FC<PropsWithChildrenAndClassName>;
    Description: React.FC<PropsWithChildrenAndClassName>;
    Meta: React.FC<PropsWithChildrenAndClassName>;
    Hero: React.FC<PropsWithChildrenAndClassName>;
    HeroImage: React.FC<PageHeaderHeroImageProps>;
    HeroBody: React.FC<PropsWithChildrenAndClassName>;
    Actions: React.FC<PropsWithChildrenAndClassName>;
    ActionGroup: PageHeaderActionGroupComponent;
    Nav: React.FC<PropsWithChildrenAndClassName>;
};

/**
 * PageHeader is the canonical page-chrome component for the List and Analytics
 * page types in Ghost Admin. It supersedes `ListHeader`, `Header`, and
 * `ViewHeader` (still exported from `@/components/layout/*` for migration).
 *
 * Composition:
 *  - `Left` + `Actions` render in a single flex row (the ListHeader-equivalent shape).
 *  - `TopRow`, `Hero`, and `Nav` render as additional rows in the order declared.
 *  - `Nav` is rendered as a sticky sibling so sub-navigation can dock under the header.
 */
const PageHeader: PageHeaderComponent = Object.assign(
    function PageHeader({className, children, sticky = true, blurredBackground = true}: PageHeaderProps) {
        const topRowChildren: React.ReactNode[] = [];
        const heroChildren: React.ReactNode[] = [];
        const navChildren: React.ReactNode[] = [];
        const mainChildren: React.ReactNode[] = [];

        React.Children.forEach(children, (child) => {
            if (!React.isValidElement(child)) {
                mainChildren.push(child);
                return;
            }

            switch (child.type) {
            case PageHeaderTopRow:
                topRowChildren.push(child);
                break;
            case PageHeaderHero:
                heroChildren.push(child);
                break;
            case PageHeaderNav:
                navChildren.push(child);
                break;
            default:
                mainChildren.push(child);
            }
        });

        const hasMainRow = mainChildren.length > 0;

        return (
            <header
                className={cn(
                    'flex flex-col gap-6 px-4 lg:px-8',
                    sticky && 'sticky top-0 z-50',
                    blurredBackground && 'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                    className
                )}
                data-page-header='page-header'
            >
                {topRowChildren.length > 0 && topRowChildren}
                {hasMainRow && (
                    <Inline
                        align='start'
                        className='w-full'
                        data-page-header='main'
                        gap='lg'
                        justify='between'
                    >
                        {mainChildren}
                    </Inline>
                )}
                {heroChildren.length > 0 && heroChildren}
                {navChildren.length > 0 && navChildren}
            </header>
        );
    },
    {
        TopRow: PageHeaderTopRow,
        Breadcrumb: PageHeaderBreadcrumb,
        ContextStrip: PageHeaderContextStrip,
        Left: PageHeaderLeft,
        Title: PageHeaderTitle,
        Count: PageHeaderCount,
        Description: PageHeaderDescription,
        Meta: PageHeaderMeta,
        Hero: PageHeaderHero,
        HeroImage: PageHeaderHeroImage,
        HeroBody: PageHeaderHeroBody,
        Actions: PageHeaderActions,
        ActionGroup: PageHeaderActionGroup,
        Nav: PageHeaderNav
    }
);

export {
    PageHeader,
    PageHeaderTopRow,
    PageHeaderBreadcrumb,
    PageHeaderContextStrip,
    PageHeaderLeft,
    PageHeaderTitle,
    PageHeaderCount,
    PageHeaderDescription,
    PageHeaderMeta,
    PageHeaderHero,
    PageHeaderHeroImage,
    PageHeaderHeroBody,
    PageHeaderActions,
    PageHeaderActionGroup,
    PageHeaderActionGroupPrimary,
    PageHeaderActionGroupMobileMenu,
    PageHeaderActionGroupMobileMenuTrigger,
    PageHeaderActionGroupMobileMenuContent,
    PageHeaderNav
};
