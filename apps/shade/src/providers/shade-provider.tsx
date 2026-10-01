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
  isAdmin7: boolean;
  /** The portal has mounted and Sonner has subscribed to new notifications. */
  isToasterReady: boolean;
  controlShape: ControlShape;
}

export type ControlShape = 'rounded' | 'pill';

const ShadeContext = createContext<ShadeContextType>({
  isAnyTextFieldFocused: false,
  setFocusState: () => {},
  darkMode: false,
  isAdmin7: true,
  isToasterReady: false,
  controlShape: 'pill',
});

export const useShade = () => useContext(ShadeContext);

export const useFocusContext = () => {
  const context = useShade();
  if (!context) {
    throw new Error('useFocusContext must be used within a FocusProvider');
  }
  return context;
};

const ToasterPortal = ({ onReady }: { onReady: (ready: boolean) => void }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    // Child effects run first: Sonner has subscribed before consumers may send a toast.
    onReady(true);
    return () => onReady(false);
  }, [mounted, onReady]);

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
  const [isToasterReady, setIsToasterReady] = useState(false);

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
        isToasterReady,
        controlShape: controlShape ?? (isAdmin7 ? 'pill' : 'rounded'),
      }}
    >
      <GlobalDirtyStateProvider>
        {/* Default Radix tooltip timing for any Tooltip without a nearer
            provider; inner providers still win via nearest-provider scoping. */}
        <TooltipProvider>
          {children}
          <ToasterPortal onReady={setIsToasterReady} />
        </TooltipProvider>
      </GlobalDirtyStateProvider>
    </ShadeContext.Provider>
  );
};

export default ShadeProvider;
