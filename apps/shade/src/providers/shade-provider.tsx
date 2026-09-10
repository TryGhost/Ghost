import React, { createContext, useContext, useEffect, useState } from 'react';
import { Toaster } from '../components/ui/sonner';
import { createPortal } from 'react-dom';
import { GlobalDirtyStateProvider } from '../hooks/use-global-dirty-state';
import Icon from '../components/ui/icon';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ShadeScope } from '@/shade-scope';

interface ShadeContextType {
  isAnyTextFieldFocused: boolean;
  setFocusState: (value: boolean) => void;
  darkMode: boolean;
  controlShape: ControlShape;
  isAdmin7Design: boolean;
}

export type ControlShape = 'rounded' | 'pill';

const ShadeContext = createContext<ShadeContextType>({
  isAnyTextFieldFocused: false,
  setFocusState: () => {},
  darkMode: false,
  controlShape: 'pill',
  isAdmin7Design: true,
});

export const useShade = () => useContext(ShadeContext);

export const useFocusContext = () => {
  const context = useShade();
  if (!context) {
    throw new Error('useFocusContext must be used within a FocusProvider');
  }
  return context;
};

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
  controlShape?: ControlShape;
  isAdmin7Design?: boolean;
  children: React.ReactNode;
}

const ShadeProvider: React.FC<ShadeProviderProps> = ({
  darkMode,
  controlShape,
  isAdmin7Design = true,
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
        isAdmin7Design,
        controlShape: controlShape ?? (isAdmin7Design ? 'pill' : 'rounded'),
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
