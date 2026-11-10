import clsx from 'clsx';
import React from 'react';
import ShadeProvider from '@/providers/shade-provider';
import type { ControlShape } from '@/providers/shade-context';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  controlShape?: ControlShape;
  /**
   * Admin's `admin7Design` Labs flag. Admin passes the flag's value; isolated Shade
   * previews and standalone apps default to the Admin 7 design. Removed with the flag.
   */
  admin7Design?: boolean;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  controlShape,
  admin7Design = true,
  className,
  children,
  ...props
}) => {
  const appClassName = clsx('shade', className);

  return (
    <div className={appClassName} {...props} data-admin7-design={admin7Design}>
      <ShadeProvider admin7Design={admin7Design} controlShape={controlShape} darkMode={darkMode}>
        {children}
      </ShadeProvider>
    </div>
  );
};

export default ShadeApp;
