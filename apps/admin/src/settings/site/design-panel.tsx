import DesignSidebar from './design-and-branding/design-sidebar';
import GlobalDataProvider from '@/settings/providers/global-data-provider';
import React, { useEffect } from 'react';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, PageHeader, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { cn } from '@tryghost/shade/utils';
import { useDesignForm } from './design-and-branding/use-design-form';

export interface DesignPanelProps {
  /** Closes the panel, once any unsaved changes have been confirmed away. */
  onClose: () => void;
  /** Runs once a save has applied the design. */
  onSaved?: () => void;
  className?: string;
}

function DesignPanelContent({ onClose, onSaved }: Omit<DesignPanelProps, 'className'>) {
  const {
    globalSettings,
    themeSettingSections,
    updateGlobalSetting,
    updateThemeSetting,
    dirty,
    okProps,
    handleSave,
  } = useDesignForm();
  const { confirm, dialogProps } = useDirtyConfirmation();

  const save = async () => {
    if (await handleSave({ fakeWhenUnchanged: true })) {
      onSaved?.();
    }
  };

  // ⌘S / Ctrl+S saves, as in the Design modal
  const saveRef = React.useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 px-7 py-6">
        <h2 className="text-xl font-bold">Design</h2>
        <div className="flex items-center gap-2">
          <PageHeader.Action label="Close" type="button" onClick={() => confirm(dirty, onClose)}>
            Close
          </PageHeader.Action>
          <Button
            disabled={okProps.disabled}
            type="button"
            variant={okProps.variant}
            onClick={() => void save()}
          >
            {okProps.label || 'Save'}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DesignSidebar
          globalSettings={globalSettings}
          themeSettingSections={themeSettingSections}
          updateGlobalSetting={updateGlobalSetting}
          updateThemeSetting={updateThemeSetting}
        />
      </div>
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
}

/**
 * The Design settings as a panel of their own, for editing the site's design
 * outside Settings (e.g. floating over View site). It brings the settings data
 * it needs, so it can be mounted anywhere in the admin.
 */
export default function DesignPanel({ className, ...props }: DesignPanelProps) {
  return (
    <aside
      aria-label="Design"
      className={cn(
        'settings-app flex flex-col overflow-hidden rounded-xl border border-border-default bg-surface-elevated-2 shadow-lg',
        className,
      )}
    >
      <GlobalDataProvider>
        <DesignPanelContent {...props} />
      </GlobalDataProvider>
    </aside>
  );
}
