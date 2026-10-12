import React, { useEffect, useState } from 'react';
import { Toaster } from '../components/ui/sonner';
import { createPortal } from 'react-dom';
import { GlobalDirtyStateProvider } from '@/providers/global-dirty-state-provider';
import Icon from '../components/ui/icon';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ShadeScope } from '@/shade-scope';
import { ShadeContext, type ControlShape } from '@/providers/shade-context';

const ToasterPortal = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted
    ? createPortal(
        <ShadeScope style={{ width: 'unset', height: 'unset' }}>
          <Toaster
            duration={5000}
            icons={{
              error: <Icon.ErrorFill className="text-red" />,
              success: <Icon.SuccessFill className="text-green" />,
              info: <Icon.InfoFill className="text-text-tertiary" />,
            }}
            position="bottom-left"
            toastOptions={{
              classNames: {
                title: 'mt-[-1px]! text-md! font-semibold! leading-tighter! tracking-[0.1px]!',
                description: 'text-text-primary! text-sm! mt-px!',
                icon: 'ml-0!',
              },
              style: {
                alignItems: 'flex-start',
                maxWidth: '290px',
              },
            }}
            closeButton
          />
        </ShadeScope>,
        document.body,
      )
    : null;
};

interface ShadeProviderProps {
  darkMode: boolean;
  isAdmin7?: boolean;
  controlShape?: ControlShape;
  children: React.ReactNode;
}

const ShadeProvider: React.FC<ShadeProviderProps> = ({
  darkMode,
  isAdmin7 = true,
  controlShape,
  children,
}) => {
  const [isAnyTextFieldFocused, setIsAnyTextFieldFocused] = useState(false);

  const setFocusState = (value: boolean) => {
    setIsAnyTextFieldFocused(value);
  };

  return (
    <ShadeContext.Provider
      value={{
        isAnyTextFieldFocused,
        setFocusState,
        darkMode,
        isAdmin7,
        controlShape: controlShape ?? (isAdmin7 ? 'pill' : 'rounded'),
      }}
    >
      <GlobalDirtyStateProvider>
        {/* Default Radix tooltip timing for any Tooltip without a nearer
            provider; inner providers still win via nearest-provider scoping. */}
        <TooltipProvider>
          {children}
          <ToasterPortal />
        </TooltipProvider>
      </GlobalDirtyStateProvider>
    </ShadeContext.Provider>
  );
};

export default ShadeProvider;
