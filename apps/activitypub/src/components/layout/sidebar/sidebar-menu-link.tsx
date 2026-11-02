import * as React from 'react';
import { Button, ButtonProps } from '@tryghost/shade/components';
import {
  Link,
  resetScrollPosition,
  useLocation,
  useNavigationStack,
} from '@tryghost/admin-x-framework';
import { cn, formatNumber } from '@tryghost/shade/utils';
import { useShade } from '@tryghost/shade/app';

import { sidebarMenuLinkClassName } from './sidebar-menu-link-class';
import { useAppBasePath } from '@src/hooks/use-app-base-path';

interface SidebarButtonProps extends ButtonProps {
  to?: string;
  children: React.ReactNode;
  count?: number;
}

const SidebarMenuLink = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
  ({ to, children, count, ...props }, ref) => {
    const location = useLocation();
    const { resetStack } = useNavigationStack();
    const basePath = useAppBasePath();

    // Build full path by prepending base path to absolute paths
    // Following the same pattern as useNavigateWithBasePath
    const fullPath = to && to.startsWith('/') ? `${basePath}${to}` : to;
    const isActive =
      fullPath && (location.pathname === fullPath || location.pathname.startsWith(`${fullPath}/`));

    const { admin7Design } = useShade();
    const linkClass = sidebarMenuLinkClassName({ admin7Design, isActive: Boolean(isActive) });

    const badge =
      count && count > 0 ? (
        <span
          className={cn(
            'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500 px-1.5 py-1 text-xs font-semibold text-white',
          )}
        >
          {formatNumber(count)}
        </span>
      ) : null;

    if (fullPath) {
      return (
        <Button className={linkClass} shape="rounded" variant="ghost" asChild>
          <Link
            to={fullPath}
            onClick={() => {
              resetStack();
              resetScrollPosition(fullPath);
            }}
          >
            {children}
            {badge}
          </Link>
        </Button>
      );
    }

    return (
      <Button
        ref={ref}
        className={linkClass}
        shape="rounded"
        variant="ghost"
        onClick={props.onClick}
        {...props}
      >
        {children}
        {badge}
      </Button>
    );
  },
);

SidebarMenuLink.displayName = 'SidebarMenuLink';

export default SidebarMenuLink;
