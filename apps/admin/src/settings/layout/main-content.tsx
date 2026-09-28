import Settings from './settings-sections';
import Sidebar from './sidebar';
import ExitSettingsButton from '@/settings/components/exit-settings-button';
import Users from '@/settings/general/users';
import { DirtyConfirmDialog, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { type ReactNode, useEffect } from 'react';
import { Text } from '@tryghost/shade/primitives';
import { canAccessSettings, isEditorUser } from '@tryghost/admin-x-framework/api/users';
import { toast } from 'sonner';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useGlobalDirtyState } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useExitSettings } from '@/settings/hooks/use-exit-settings';

const EMPTY_KEYWORDS: string[] = [];
const OPEN_SHADE_MODAL_SELECTOR = ':is([role="dialog"], [role="alertdialog"])[data-state="open"]';
// The shell's mobile navigation sheet (which holds the Settings nav) closes on ESC itself.
const OPEN_MOBILE_SIDEBAR_SELECTOR = '[data-mobile="true"][data-state="open"]';

const LegacyPage: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <>
      <div
        className="fixed top-2 right-0 z-50 m-8 flex justify-end bg-transparent tablet:fixed tablet:top-0"
        id="done-button-container"
      >
        <ExitSettingsButton />
      </div>
      <div
        className="fixed top-0 left-0 flex size-full bg-gray-50 dark:bg-gray-950 dark:tablet:bg-[#101114]"
        id="settings-content"
      >
        {children}
      </div>
    </>
  );
};

const MainContent: React.FC = () => {
  const { currentUser } = useGlobalData();
  const { isDirty } = useGlobalDirtyState();
  const { confirm, dialogProps } = useDirtyConfirmation();
  const exitSettings = useExitSettings();
  const admin7Settings = useFeatureFlag('admin7settings');
  const hasOpenModal = () => {
    if (document.getElementById('modal-backdrop')) {
      return true;
    }

    return Boolean(
      document.querySelector(OPEN_SHADE_MODAL_SELECTOR) ||
      document.querySelector(OPEN_MOBILE_SIDEBAR_SELECTOR),
    );
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
    if (!admin7Settings) {
      return (
        <LegacyPage>
          <div className="min-w-0 flex-1 bg-white dark:bg-gray-950">
            <div className="h-full overflow-y-auto overscroll-y-contain" id="settings-scroller">
              <div className="mx-auto max-w-5xl px-[5vmin] tablet:mt-16 xl:mt-10">
                <Text as="h1" className="mb-[5vmin] text-4xl" leading="supertight" weight="bold">
                  Settings
                </Text>
                <Users highlight={false} keywords={EMPTY_KEYWORDS} />
              </div>
            </div>
          </div>
          <DirtyConfirmDialog {...dialogProps} />
        </LegacyPage>
      );
    }

    return (
      <>
        <div className="h-full overflow-y-auto overscroll-y-contain" id="settings-scroller">
          <div className="mx-auto max-w-5xl px-[5vmin] tablet:mt-16 xl:mt-10">
            <Text as="h1" className="mb-[5vmin] text-4xl" leading="supertight" weight="bold">
              Settings
            </Text>
            <Users highlight={false} keywords={EMPTY_KEYWORDS} />
          </div>
        </div>
        <DirtyConfirmDialog {...dialogProps} />
      </>
    );
  }

  if (!admin7Settings) {
    return (
      <LegacyPage>
        <div
          className="fixed inset-x-0 top-0 z-[35] max-w-[calc(100%-16px)] flex-1 basis-[320px] overscroll-y-contain bg-white p-8 tablet:relative tablet:inset-x-auto tablet:top-auto tablet:h-full tablet:overflow-y-scroll tablet:bg-gray-50 tablet:py-0 dark:bg-gray-950 dark:tablet:bg-[#101114]"
          id="settings-sidebar-scroller"
        >
          <div className="relative w-full">
            <Sidebar />
          </div>
        </div>
        <div className="h-full min-w-0 flex-1 bg-white tablet:basis-[800px] dark:bg-gray-950 dark:tablet:bg-black">
          <div
            className="relative h-full overflow-y-scroll overscroll-y-contain pt-13"
            id="settings-scroller"
          >
            <Settings />
          </div>
        </div>
        <DirtyConfirmDialog {...dialogProps} />
      </LegacyPage>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto overscroll-y-contain" id="settings-scroller">
        <Settings />
      </div>
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

export default MainContent;
