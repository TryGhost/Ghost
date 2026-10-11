import DesignSidebar from './design-and-branding/design-sidebar';
import GlobalDataProvider from '@/settings/providers/global-data-provider';
import { createPortal } from 'react-dom';
import { ADMIN_FRAME_TRANSITION, useAdminFramePanelSlot } from '@/layout/admin-frame-panel-slot';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ThemePreview from './design-and-branding/theme-preview';
import { Button } from '@tryghost/shade/components';
import { DirtyConfirmDialog, PageHeader, useDirtyConfirmation } from '@tryghost/shade/patterns';
import { cn } from '@tryghost/shade/utils';
import { useDesignForm } from './design-and-branding/use-design-form';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

export interface DesignPanelProps {
  /** The site page to preview the design on, over whatever the panel floats above. */
  pageUrl: string;
  /**
   * Reads the page the site underneath is on, where it can be browsed until
   * the preview takes over; the preview then starts there.
   */
  livePageUrl?: () => string | undefined;
  /** The URL search param that keeps the panel open; leaving it closes the panel. */
  openParam: string;
  /** Closes the panel, once any unsaved changes have been confirmed away. */
  onClose: () => void;
  /** Runs once a save has applied the design, with the page previewed. */
  onSaved?: (pageUrl: string) => void;
  /**
   * The panel has been closed and is on its way out: it tucks back under the
   * page, then calls onClosed, for the panel to be unmounted.
   */
  closing?: boolean;
  onClosed?: () => void;
}

// Docked in the frame, the panel comes out from under the page and goes back
// under it, in step with the page pulling away and closing back over it
const TUCKED: Keyframe = { transform: 'translateX(-25%) scale(0.96)', opacity: 0 };
const OUT: Keyframe = { transform: 'none', opacity: 1 };
// Coming out, it waits for the page to start pulling away, and grows a touch
const ENTERING: Keyframe = { transform: 'translateX(-8%) scale(0.96)', opacity: 0 };
const ENTRY_DELAY = 160;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useTuckAnimation(
  asideRef: React.RefObject<HTMLElement>,
  docked: boolean,
  closing: boolean,
  onClosed: (() => void) | undefined,
) {
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const openingRef = useRef<Animation>();

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside || !docked || prefersReducedMotion()) {
      return;
    }
    const opening = aside.animate([ENTERING, OUT], {
      ...ADMIN_FRAME_TRANSITION,
      delay: ENTRY_DELAY,
      // Tucked away while it waits
      fill: 'backwards',
    });
    openingRef.current = opening;
    return () => opening.cancel();
  }, [asideRef, docked]);

  useLayoutEffect(() => {
    if (!closing) {
      return;
    }
    const aside = asideRef.current;
    if (!aside || !docked || prefersReducedMotion()) {
      onClosedRef.current?.();
      return;
    }
    // From wherever it had got to, should it still be on its way out
    const opening = openingRef.current;
    if (opening?.playState === 'running') {
      opening.commitStyles();
      opening.cancel();
    }
    const closingAnimation = aside.animate([TUCKED], {
      ...ADMIN_FRAME_TRANSITION,
      fill: 'forwards',
    });
    closingAnimation.finished.then(
      () => onClosedRef.current?.(),
      () => {},
    );
    return () => closingAnimation.cancel();
  }, [asideRef, docked, closing]);
}

function DesignPanelContent({
  pageUrl: initialPageUrl,
  livePageUrl,
  openParam,
  onClose,
  onSaved,
  closing = false,
  onClosed,
}: DesignPanelProps) {
  const {
    globalSettings,
    themeSettingSections,
    previewSettings,
    updateGlobalSetting,
    updateThemeSetting,
    dirty,
    okProps,
    handleSave,
  } = useDesignForm();
  const { confirm, dialogProps } = useDirtyConfirmation();

  // The preview takes over from the first change until the panel closes (a
  // save keeps it, as it now shows the saved design), on the page the site
  // underneath had got to; from there, it's browsed in its own right
  const [previewing, setPreviewing] = useState(false);
  const [pageUrl, setPageUrl] = useState(initialPageUrl);
  if (dirty && !previewing) {
    setPreviewing(true);
    const livePage = livePageUrl?.();
    if (livePage && livePage !== pageUrl) {
      setPageUrl(livePage);
    }
  }

  // Unsaved changes hold navigations away (e.g. the top bar's Ghost) and in
  // place ones that close the panel (Back, or Customize again), which the
  // guard's own check, by path, lets through
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const guard = useUnsavedChangesGuard({
    // Once closed, its changes are gone, whatever the form still holds
    when: dirty && !closing,
    interceptNavigation: ({ currentLocation, nextLocation }) =>
      dirtyRef.current &&
      currentLocation.pathname === nextLocation.pathname &&
      !new URLSearchParams(nextLocation.search).has(openParam),
  });

  const close = () =>
    confirm(dirty, () => {
      guard.bypassNextNavigation();
      onClose();
    });

  const save = async () => {
    // Saving without changes reports success, but leaves the site as it was
    const changed = dirtyRef.current;
    if ((await handleSave({ fakeWhenUnchanged: true })) && changed) {
      onSaved?.(pageUrl);
    }
  };

  // ⌘S / Ctrl+S saves, as in the Design modal
  const saveRef = useRef(save);
  saveRef.current = closing ? async () => {} : save;
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

  const { interceptedNavigation } = guard;

  // Sits in the frame's right edge where there is one, uncovered as the page
  // card pulls away from it; otherwise it floats over the page
  const panelSlot = useAdminFramePanelSlot();
  const asideRef = useRef<HTMLElement>(null);
  useTuckAnimation(asideRef, Boolean(panelSlot), closing, onClosed);

  // Out of reach on its way out. Applied through a ref because React 18 has
  // no first-class inert prop.
  useLayoutEffect(() => {
    if (asideRef.current) {
      asideRef.current.inert = closing;
    }
  }, [closing]);

  const panel = (
    <aside
      ref={asideRef}
      aria-label="Design"
      className={cn(
        'settings-app pointer-events-auto flex flex-col overflow-hidden',
        panelSlot
          ? // Down the frame's right: dark, on the frame's own black
            'dark dark-island size-full bg-black text-foreground [--surface-elevated-2:var(--color-black)]!'
          : 'absolute inset-y-3 right-3 z-10 w-[400px] rounded-xl border border-border-default bg-surface-elevated-2 shadow-lg motion-safe:animate-[view-site-panel-in_320ms_cubic-bezier(0.16,1,0.3,1)]',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-3',
          // Docked, it sits right up under the frame's top bar
          panelSlot ? 'px-6 pb-4' : 'px-7 py-6',
        )}
      >
        <h2 className={cn('text-xl font-bold', panelSlot && 'text-white!')}>Design</h2>
        <div className="flex items-center gap-2">
          <PageHeader.Action
            label="Close"
            size={panelSlot ? 'sm' : undefined}
            type="button"
            onClick={close}
          >
            Close
          </PageHeader.Action>
          <Button
            disabled={okProps.disabled}
            size={panelSlot ? 'sm' : undefined}
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
          className={panelSlot ? 'px-6' : undefined}
          globalSettings={globalSettings}
          themeSettingSections={themeSettingSections}
          updateGlobalSetting={updateGlobalSetting}
          updateThemeSetting={updateThemeSetting}
        />
      </div>
    </aside>
  );

  return (
    <>
      {/* Mounted from the start, so it has loaded by the first change */}
      <div
        aria-hidden={!previewing}
        className={cn(
          'absolute inset-0 transition-opacity duration-200',
          previewing && !closing ? 'pointer-events-auto opacity-100' : 'opacity-0',
        )}
        data-testid="design-panel-preview"
      >
        <ThemePreview
          scaled={false}
          settings={previewSettings}
          url={pageUrl}
          onNavigate={setPageUrl}
        />
      </div>
      {panelSlot ? createPortal(panel, panelSlot) : panel}
      <DirtyConfirmDialog {...dialogProps} />
      <DirtyConfirmDialog {...guard.dialogProps} />
      <DirtyConfirmDialog
        open={interceptedNavigation.isBlocked}
        onConfirm={interceptedNavigation.proceed}
        onOpenChange={(open) => {
          if (!open && interceptedNavigation.isBlocked) {
            interceptedNavigation.reset();
          }
        }}
      />
    </>
  );
}

/**
 * The Design settings as a panel of their own, floating over a page of the
 * site (View site's Customize): from the first change, a preview of that page
 * with the unsaved design takes its place. It brings the settings data it
 * needs, so it can be mounted anywhere in the admin; it fills its positioned
 * parent.
 */
export default function DesignPanel(props: DesignPanelProps) {
  return (
    // Lets the pointer through to what it floats over, except where it shows something
    <div className="pointer-events-none absolute inset-0">
      <GlobalDataProvider>
        <DesignPanelContent {...props} />
      </GlobalDataProvider>
    </div>
  );
}
