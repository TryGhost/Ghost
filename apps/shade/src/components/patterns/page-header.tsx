import { useShade } from '@/providers/shade-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, type ButtonProps } from '@/components/ui/button';
import { SelectTrigger } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { H1 } from '@/components/layout/heading';
import { Inline, Stack, Text } from '@/components/primitives';
import { cn } from '@/lib/utils';

import React from 'react';
import { ListFilter } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
  className?: string;
};

type PageHeaderProps = PropsWithChildrenAndClassName & {
  sticky?: boolean;
  blurredBackground?: boolean;
};

/** Header tooltips require Admin 7 and never belong on primary actions. */
function PageHeaderTooltip({
  children,
  label,
  shortcut,
}: React.PropsWithChildren<{ label: string; shortcut?: string }>) {
  const { isAdmin7Pill } = useShade();
  if (!isAdmin7Pill) {
    return <>{children}</>;
  }
  return (
    <Tooltip>
      {children}
      <TooltipContent side="bottom" variant="white">
        <Inline align="center" gap="sm">
          {label}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </Inline>
      </TooltipContent>
    </Tooltip>
  );
}

const PageHeaderTooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipTrigger>,
  React.ComponentPropsWithoutRef<typeof TooltipTrigger>
>(({ children, asChild, ...props }, ref) => {
  const { isAdmin7Pill } = useShade();
  const PlainTrigger = asChild ? Slot : 'button';
  return isAdmin7Pill ? (
    <TooltipTrigger ref={ref} asChild={asChild} {...props}>
      {children}
    </TooltipTrigger>
  ) : (
    <PlainTrigger ref={ref} {...props}>
      {children}
    </PlainTrigger>
  );
});
PageHeaderTooltipTrigger.displayName = 'PageHeaderTooltipTrigger';

const PrimaryActionContext = React.createContext(false);

type PageHeaderActionProps = ButtonProps & {
  label: string;
  iconOnly?: boolean;
  primary?: boolean;
  shortcut?: string;
  /** Temporary compatibility for existing screens; new headers use the defaults. */
  fallbackVariant?: ButtonProps['variant'];
  fallbackSize?: ButtonProps['size'];
};

const PageHeaderAction = React.forwardRef<HTMLButtonElement, PageHeaderActionProps>(
  (
    {
      label,
      iconOnly = false,
      primary: primaryProp,
      shortcut,
      fallbackVariant = 'outline',
      fallbackSize,
      className,
      ...props
    },
    ref,
  ) => {
    const { isAdmin7Pill } = useShade();
    const primaryContext = React.useContext(PrimaryActionContext);
    const primary = primaryProp ?? primaryContext;
    const button = (
      <Button
        ref={ref}
        aria-keyshortcuts={shortcut}
        aria-label={label}
        className={cn(isAdmin7Pill && '[&_svg]:stroke-2!', className)}
        size={isAdmin7Pill ? (iconOnly ? 'icon' : undefined) : fallbackSize}
        variant={isAdmin7Pill ? (primary ? 'default' : 'ghost') : fallbackVariant}
        {...props}
      />
    );
    return primary || !isAdmin7Pill ? (
      button
    ) : (
      <PageHeaderTooltip label={label} shortcut={shortcut}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
      </PageHeaderTooltip>
    );
  },
);
PageHeaderAction.displayName = 'PageHeaderAction';

const PageHeaderFilterTrigger = React.forwardRef<
  HTMLButtonElement,
  Omit<PageHeaderActionProps, 'label'>
>((props, ref) => (
  <PageHeaderAction
    ref={ref}
    data-slot="filters-add"
    label="Filter"
    shortcut="F"
    type="button"
    {...props}
  >
    <ListFilter className="size-4" />
    Filter
  </PageHeaderAction>
));
PageHeaderFilterTrigger.displayName = 'PageHeaderFilterTrigger';

const PageHeaderSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger> & { label: string }
>(({ label, className, ...props }, ref) => {
  const { isAdmin7Pill } = useShade();
  return (
    <PageHeaderTooltip label={label}>
      <PageHeaderTooltipTrigger asChild>
        <SelectTrigger
          ref={ref}
          aria-label={label}
          className={cn('w-auto', isAdmin7Pill && 'font-medium [&_svg]:stroke-2!', className)}
          showChevron={!isAdmin7Pill}
          variant={isAdmin7Pill ? 'ghost' : 'default'}
          {...props}
        />
      </PageHeaderTooltipTrigger>
    </PageHeaderTooltip>
  );
});
PageHeaderSelectTrigger.displayName = 'PageHeaderSelectTrigger';

// ---------------------------------------------------------------------------
// Title-block primitives
// ---------------------------------------------------------------------------

function PageHeaderBreadcrumb({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Inline
      align="center"
      className={cn('pt-1 text-sm text-muted-foreground', className)}
      data-page-header="breadcrumb"
      gap="sm"
    >
      {children}
    </Inline>
  );
}

function PageHeaderCount({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Text
      as="span"
      className={cn('ml-1 text-base tabular-nums', className)}
      data-page-header="count"
      tone="secondary"
      weight="regular"
    >
      {children}
    </Text>
  );
}

function PageHeaderDescription({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Text as="p" className={className} data-page-header="description" size="sm" tone="secondary">
      {children}
    </Text>
  );
}

function PageHeaderMeta({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Text
      as="p"
      className={cn('mt-0.5', className)}
      data-page-header="meta"
      size="sm"
      tone="secondary"
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
function PageHeaderTitle({ className, children }: PropsWithChildrenAndClassName) {
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
      className={cn('text-lg font-semibold tracking-[0.1px] whitespace-nowrap', className)}
      data-page-header="title"
    >
      {headingChildren}
    </H1>
  );

  if (subTextChildren.length > 0) {
    return (
      <Stack data-page-header="title-body" gap="none">
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

function PageHeaderLeft({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Stack
      className={cn('h-full min-h-(--control-height) min-w-0', className)}
      data-page-header="left"
      gap="xs"
      justify="center"
    >
      {children}
    </Stack>
  );
}

type PageHeaderActionGroupPrimaryProps = PropsWithChildrenAndClassName;
function PageHeaderActionGroupPrimary({ children, className }: PageHeaderActionGroupPrimaryProps) {
  const { isAdmin7Pill } = useShade();
  if (React.Children.toArray(children).length === 0) {
    return null;
  }
  return (
    <PrimaryActionContext.Provider value={true}>
      {isAdmin7Pill ? (
        <Inline
          className={cn('ms-4 shrink-0 first:ms-0', className)}
          data-page-header="primary"
          gap="none"
        >
          {children}
        </Inline>
      ) : className ? (
        <Slot className={className}>{children}</Slot>
      ) : (
        children
      )}
    </PrimaryActionContext.Provider>
  );
}

type PageHeaderActionGroupMobileMenuProps = React.PropsWithChildren;
function PageHeaderActionGroupMobileMenu({ children }: PageHeaderActionGroupMobileMenuProps) {
  return <DropdownMenu>{children}</DropdownMenu>;
}

type PageHeaderActionGroupMobileMenuTriggerProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuTrigger
>;
function PageHeaderActionGroupMobileMenuTrigger({
  children,
  ...props
}: PageHeaderActionGroupMobileMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild {...props}>
      {children}
    </DropdownMenuTrigger>
  );
}

type PageHeaderActionGroupMobileMenuContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenuContent
>;
function PageHeaderActionGroupMobileMenuContent({
  children,
  ...props
}: PageHeaderActionGroupMobileMenuContentProps) {
  return (
    <DropdownMenuContent align="end" sideOffset={8} {...props}>
      {children}
    </DropdownMenuContent>
  );
}

function PageHeaderTooltipProvider({ children }: React.PropsWithChildren) {
  const { isAdmin7Pill } = useShade();
  return isAdmin7Pill ? (
    <TooltipProvider delayDuration={1000} skipDelayDuration={300}>
      {children}
    </TooltipProvider>
  ) : (
    <>{children}</>
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
  function PageHeaderActionGroup({
    className,
    children,
    mobileMenuBreakpoint = DEFAULT_MOBILE_MENU_BREAKPOINT,
  }: PageHeaderActionGroupProps) {
    const { isAdmin7Pill } = useShade();
    const gap = isAdmin7Pill ? 'xs' : 'sm';
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

      const childElement = child as React.ReactElement<{ children?: React.ReactNode }>;

      if (childElement.type === PageHeaderActionGroupMobileMenu) {
        mobileMenu = childElement;
        return;
      }

      if (childElement.type === PageHeaderActionGroupPrimary) {
        primaryAction = childElement;
        desktopChildren.push(childElement);
        return;
      }

      desktopChildren.push(childElement);
    });

    if (!mobileMenu) {
      return (
        <PageHeaderTooltipProvider>
          <Inline
            align="center"
            className={className}
            data-page-header="action-group"
            gap={gap}
            justify="end"
          >
            {children}
          </Inline>
        </PageHeaderTooltipProvider>
      );
    }

    if (!shouldCollapse) {
      return (
        <PageHeaderTooltipProvider>
          <Inline
            align="center"
            className={className}
            data-page-header="action-group"
            gap={gap}
            justify="end"
          >
            <Inline align="center" data-page-header="action-group-desktop" gap={gap} justify="end">
              {desktopChildren}
            </Inline>
          </Inline>
        </PageHeaderTooltipProvider>
      );
    }

    return (
      <PageHeaderTooltipProvider>
        <Inline
          align="center"
          className={className}
          data-page-header="action-group"
          gap={gap}
          justify="end"
        >
          <Inline
            align="center"
            className="ml-auto"
            data-page-header="action-group-mobile"
            gap={gap}
          >
            {mobileMenu}
            {primaryAction &&
              (isAdmin7Pill ? (
                primaryAction
              ) : (
                <div data-page-header="action-group-mobile-primary">{primaryAction}</div>
              ))}
          </Inline>
        </Inline>
      </PageHeaderTooltipProvider>
    );
  },
  {
    Primary: PageHeaderActionGroupPrimary,
    MobileMenu: PageHeaderActionGroupMobileMenu,
    MobileMenuTrigger: PageHeaderActionGroupMobileMenuTrigger,
    MobileMenuContent: PageHeaderActionGroupMobileMenuContent,
  },
);

function PageHeaderActions({ className, children }: PropsWithChildrenAndClassName) {
  return (
    <Inline
      align="center"
      className={cn('min-h-(--control-height) shrink-0', className)}
      data-page-header="actions"
      gap="lg"
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
  Action: typeof PageHeaderAction;
  FilterTrigger: typeof PageHeaderFilterTrigger;
  SelectTrigger: typeof PageHeaderSelectTrigger;
  Tooltip: typeof PageHeaderTooltip;
  TooltipTrigger: typeof PageHeaderTooltipTrigger;
};

/**
 * PageHeader is the canonical page-chrome component for Ghost Admin pages.
 *
 * The main row contains `Left` (Breadcrumb + Title) and `Actions`.
 * Compose optional ViewBar and FilterBar rows beside it in ListPage.Header.
 * `Title` accepts an inline `Count` and stacked `Description`/`Meta` children.
 * See page-header.mdx for the action ordering and interaction contract.
 */
const PageHeader: PageHeaderComponent = Object.assign(
  function PageHeader({
    className,
    children,
    sticky = true,
    blurredBackground = true,
  }: PageHeaderProps) {
    return (
      <header
        className={cn(
          'flex flex-col',
          sticky && 'sticky top-0 z-50',
          blurredBackground &&
            'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
          className,
        )}
        data-page-header="page-header"
      >
        <Inline align="start" className="w-full" data-page-header="main" gap="lg" justify="between">
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
    ActionGroup: PageHeaderActionGroup,
    Action: PageHeaderAction,
    FilterTrigger: PageHeaderFilterTrigger,
    SelectTrigger: PageHeaderSelectTrigger,
    Tooltip: PageHeaderTooltip,
    TooltipTrigger: PageHeaderTooltipTrigger,
  },
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
  PageHeaderActionGroupMobileMenuContent,
};
