import { useContext } from 'react';
import { Separator, SidebarTrigger, useSidebar } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { AdminSidebarContext } from './use-admin-sidebar';

export function AdminSidebarToggle() {
  const controller = useContext(AdminSidebarContext);
  const { open } = useSidebar();

  if (!controller?.enabled) {
    return null;
  }

  return (
    <>
      <SidebarTrigger
        aria-disabled={controller.isSaving}
        aria-label={open ? 'Hide sidebar' : 'Show sidebar'}
      >
        <LucideIcon.PanelLeft />
      </SidebarTrigger>
      <Separator className="h-4" orientation="vertical" decorative />
    </>
  );
}
