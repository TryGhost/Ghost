import clsx from 'clsx';
import React from 'react';
import ShadeProvider from '@/providers/shade-provider';
import {
  ADMIN7_PREVIEW_FEATURES,
  Admin7Provider,
  type Admin7Features,
  getAdmin7ScopeAttributes,
} from '@/providers/admin7-provider';

/**
 * The className is used to scope the styles of the app to the app's namespace.
 * Some components in radixUI/ShadCN need to be wrapped in a div with the className
 * in order to work correctly.
 */
export const SHADE_APP_NAMESPACES = 'shade shade-admin shade-activitypub';

export interface ShadeAppProps extends React.HTMLProps<HTMLDivElement> {
  darkMode: boolean;
  /** Hosts supply resolved milestones; standalone Shade previews use future defaults. */
  admin7?: Admin7Features;
}

const ShadeApp: React.FC<ShadeAppProps> = ({
  darkMode,
  admin7 = ADMIN7_PREVIEW_FEATURES,
  className,
  children,
  ...props
}) => {
  const appClassName = clsx('shade', className);

  return (
    <div className={appClassName} {...props} {...getAdmin7ScopeAttributes(admin7)}>
      <Admin7Provider features={admin7}>
        <ShadeProvider darkMode={darkMode}>{children}</ShadeProvider>
      </Admin7Provider>
    </div>
  );
};

export default ShadeApp;
