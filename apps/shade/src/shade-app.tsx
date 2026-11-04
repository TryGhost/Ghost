import React from 'react';
import { type AppOverlay, AppOverlayContext } from '@/lib/app-overlay';
import ShadeProvider from '@/providers/shade-provider';
import type { ControlShape } from '@/providers/shade-context';
import { useSafeAreaSlide } from '@/lib/safe-area';
import { cn } from '@/lib/utils';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

/*
 * In a Ghost app, Admin's chrome floats over the edges of the app's page, and the app SDK sets how
 * far it reaches in as `--ghost-safe-area-inset-*`. Padding by them keeps the app's content clear
 * of the chrome. Anywhere else the variables aren't set, so there's no padding.
 */
const SAFE_AREA_PADDING = cn(
  'pt-[var(--ghost-safe-area-inset-top,0px)] pr-[var(--ghost-safe-area-inset-right,0px)]',
  'pb-[var(--ghost-safe-area-inset-bottom,0px)] pl-[var(--ghost-safe-area-inset-left,0px)]',
);

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  controlShape?: ControlShape;
  /**
   * Admin's `admin7Design` Labs flag. Admin passes the flag's value; isolated Shade
   * previews and standalone apps default to the Admin 7 design. Removed with the flag.
   */
  admin7Design?: boolean;
  /** Temporary Admin mobile-hardening flag. Standalone surfaces stay off by default. */
  admin7Mobile?: boolean;
  /**
   * For an app inside Ghost Admin: where dialogs, alert dialogs and sheets render so they cover
   * all of Admin, not just the app's frame. Pass the app SDK's `ghost.overlay`.
   */
  overlay?: AppOverlay;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  controlShape,
  admin7Design = true,
  admin7Mobile = false,
  overlay,
  className,
  children,
  ...props
}) => {
  const root = React.useRef<HTMLDivElement>(null);
  useSafeAreaSlide(root);
  // After the safe area's padding, so a className's own padding wins.
  const appClassName = cn('shade', SAFE_AREA_PADDING, className);

  return (
    <div
      ref={root}
      className={appClassName}
      {...props}
      data-admin7-design={admin7Design}
      data-admin7-mobile={admin7Mobile}
    >
      <ShadeProvider
        admin7Design={admin7Design}
        admin7Mobile={admin7Mobile}
        controlShape={controlShape}
        darkMode={darkMode}
      >
        <AppOverlayContext.Provider value={overlay}>{children}</AppOverlayContext.Provider>
      </ShadeProvider>
    </div>
  );
};

export default ShadeApp;
