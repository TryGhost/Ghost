import { cn } from '@tryghost/shade/utils';

/**
 * The Network sidebar's menu rows. With admin7Design they take Admin's main
 * sidebar colours, with inactive labels a little lighter (gray-900, black on
 * hover), inactive icons a step lighter again (full colour on hover), and the
 * sidebar accent for hover and the current page.
 */
export function sidebarMenuLinkClassName({
  admin7Design,
  isActive = false,
}: {
  admin7Design: boolean;
  isActive?: boolean;
}) {
  if (admin7Design) {
    return cn(
      'h-8 justify-start font-medium text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground dark:hover:bg-gray-900/30 [&_svg]:size-[18px]',
      isActive
        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent'
        : 'text-gray-900 dark:text-sidebar-foreground [&:not(:hover)_svg]:text-gray-700 dark:[&:not(:hover)_svg]:text-gray-600',
    );
  }

  return cn(
    'h-8 justify-start font-medium text-gray-800 dark:text-gray-500 dark:hover:bg-gray-950/70 [&_svg]:size-[18px]',
    isActive && 'bg-gray-100 font-semibold text-black dark:bg-gray-950/70 dark:text-white',
  );
}
