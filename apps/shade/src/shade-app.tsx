import clsx from 'clsx';
import React from 'react';
import ShadeProvider from '@/providers/shade-provider';
import type { ControlShape } from '@/providers/shade-provider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  controlShape?: ControlShape;
  /** Admin supplies the effective flag; isolated Shade previews use the new design. */
  isAdmin7?: boolean;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  controlShape,
  isAdmin7 = true,
  className,
  children,
  ...props
}) => {
  const appClassName = clsx('shade', className);

  return (
    <div className={appClassName} {...props} data-admin7-pill={isAdmin7}>
      <ShadeProvider controlShape={controlShape} darkMode={darkMode} isAdmin7={isAdmin7}>
        {children}
      </ShadeProvider>
    </div>
  );
};

export default ShadeApp;
