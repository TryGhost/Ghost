import Settings from './settings-sections';
import { SettingsHeader, SettingsSearchStatus } from './sidebar';
import Users from '@/settings/general/users';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { useEffect } from 'react';
import { Stack, Text } from '@tryghost/shade/primitives';
import { canAccessSettings, isEditorUser } from '@tryghost/admin-x-framework/api/users';
import { toast } from 'sonner';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useGlobalDirtyState, useIsMobile } from '@tryghost/shade/utils';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';

const EMPTY_KEYWORDS: string[] = [];
const OPEN_SHADE_MODAL_SELECTOR = ':is([role="dialog"], [role="alertdialog"])[data-state="open"]';

const MainContent: React.FC = () => {
  const { currentUser } = useGlobalData();
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const exitSettings = useExitSettings();
  const isMobile = useIsMobile();
  const hasOpenModal = () => {
    if (document.getElementById('modal-backdrop')) {
      return true;
    }

    return Boolean(document.querySelector(OPEN_SHADE_MODAL_SELECTOR));
  };

  useEffect(() => {
    // Reset any toasts that may have been left open before entering Settings.
    toast.dismiss();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Don't navigate away if a modal is open - let the modal handle ESC
        if (hasOpenModal()) {
          return;
        }

        confirm(isDirty, exitSettings);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirm, exitSettings, isDirty]);

  // Contributors/Authors only see their profile modal (rendered via routing)
  // Don't render the main settings content for them
  if (!canAccessSettings(currentUser)) {
    return null;
  }

  if (isEditorUser(currentUser)) {
    // One tree for both breakpoints, so crossing it doesn't remount the page
    // and drop unsaved edits.
    return (
      <Stack className="h-full min-h-0" gap="none">
        {isMobile && <SettingsHeader className="shrink-0 px-[5vmin] pt-4 pb-2" />}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" id="settings-scroller">
          <div className="mx-auto max-w-5xl px-[5vmin] tablet:mt-16 xl:mt-10">
            <Text as="h1" className="mb-[5vmin] text-4xl" leading="supertight" weight="bold">
              Settings
            </Text>
            <Users highlight={false} keywords={EMPTY_KEYWORDS} />
          </div>
        </div>
        <DirtyConfirmDialog {...dialogProps} />
      </Stack>
    );
  }

  // On desktop the header and no-result message live in the shell's Settings
  // navigation; on mobile the page carries them.
  return (
    <Stack className="h-full min-h-0" gap="none">
      {isMobile && <SettingsHeader className="shrink-0 px-8 pt-4 pb-2" />}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" id="settings-scroller">
        {isMobile && <SettingsSearchStatus className="mx-auto max-w-[760px] px-8 pt-8" />}
        <Settings />
      </div>
      <DirtyConfirmDialog {...dialogProps} />
    </Stack>
  );
};

export default MainContent;
