import clsx from 'clsx';
import React from 'react';
import ShadeProvider from './providers/shade-provider';
import type { ControlShape, ShadeDesign } from './providers/shade-provider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  controlShape?: ControlShape;
  /** Temporary compatibility boundary. New surfaces use the current design by default. */
  design?: ShadeDesign;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  controlShape,
  design = 'current',
  className,
  children,
  ...props
}) => {
  const appClassName = clsx(
    'shade',
    design === 'legacy' ? 'shade-design-legacy' : 'shade-design-current',
    className,
  );

  return (
    <div className={appClassName} {...props}>
      <ShadeProvider controlShape={controlShape} darkMode={darkMode} design={design}>
        {children}
      </ShadeProvider>
    </div>
  );
};

export default ShadeApp;
