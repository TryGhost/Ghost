import clsx from 'clsx';
import React from 'react';
import ShadeProvider from './providers/shade-provider';
import type { ControlShape } from './providers/shade-provider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  controlShape?: ControlShape;
  /** Temporary compatibility boundary. Admin 7 is enabled by default. */
  isAdmin7Design?: boolean;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  controlShape,
  isAdmin7Design = true,
  className,
  children,
  ...props
}) => {
  const appClassName = clsx('shade', className);

  return (
    <div className={appClassName} data-admin7-design={isAdmin7Design} {...props}>
      <ShadeProvider
        controlShape={controlShape}
        darkMode={darkMode}
        isAdmin7Design={isAdmin7Design}
      >
        {children}
      </ShadeProvider>
    </div>
  );
};

export default ShadeApp;
