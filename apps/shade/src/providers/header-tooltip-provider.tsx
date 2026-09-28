import * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useShade } from '@/providers/shade-provider';

const HeaderTooltipContext = React.createContext(false);

/** Share hover timing across the whole header, including nested action groups. */
export function HeaderTooltipProvider({ children }: React.PropsWithChildren) {
  const { isAdmin7 } = useShade();
  const hasHeaderProvider = React.useContext(HeaderTooltipContext);

  if (!isAdmin7 || hasHeaderProvider) {
    return <>{children}</>;
  }

  return (
    <HeaderTooltipContext.Provider value={true}>
      <TooltipProvider delayDuration={1000} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </HeaderTooltipContext.Provider>
  );
}
