import * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

const HeaderTooltipContext = React.createContext(false);

/** Share hover timing across the whole header, including nested action groups. */
export function HeaderTooltipProvider({ children }: React.PropsWithChildren) {
  const hasHeaderProvider = React.useContext(HeaderTooltipContext);

  if (hasHeaderProvider) {
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
