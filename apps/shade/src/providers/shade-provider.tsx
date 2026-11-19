import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Toaster } from '../components/ui/sonner';
import { createPortal } from 'react-dom';
import { GlobalDirtyStateProvider } from '@/providers/global-dirty-state-provider';
import Icon from '../components/ui/icon';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ShadeScope } from '@/shade-scope';
import { ShadeContext, type ControlShape } from '@/providers/shade-context';

const safeAreaOffset = (offset: number) => ({
  top: `calc(${offset}px + var(--ghost-safe-area-inset-top, 0px))`,
  right: `calc(${offset}px + var(--ghost-safe-area-inset-right, 0px))`,
  bottom: `calc(${offset}px + var(--ghost-safe-area-inset-bottom, 0px))`,
  left: `calc(${offset}px + var(--ghost-safe-area-inset-left, 0px))`,
});

const ToasterPortal = ({ container }: { container: HTMLElement | undefined }) => {
  // One host for the Toaster's whole life, moved to where toasts show: portalling into another
  // element would remount the Toaster and restart its toasts.
  const [host, setHost] = useState<HTMLElement>();

  useEffect(() => {
    const element = document.createElement('div');
    setHost(element);
    return () => element.remove();
  }, []);

  useLayoutEffect(() => {
    if (!host) {
      return;
    }
    // An app's overlay document can go while a dialog is open in it.
    const live = container?.isConnected && container.ownerDocument.defaultView !== null;
    (live ? container : document.body).append(host);
  }, [host, container]);

  return host
    ? createPortal(
        <ShadeScope style={{ width: 'unset', height: 'unset' }}>
          <Toaster
            duration={5000}
            icons={{
              error: <Icon.ErrorFill className="text-red" />,
              success: <Icon.SuccessFill className="text-green" />,
              info: <Icon.InfoFill className="text-text-tertiary" />,
            }}
            mobileOffset={safeAreaOffset(16)}
            offset={safeAreaOffset(24)}
            position="bottom-left"
            toastOptions={{
              classNames: {
                title: 'mt-[-1px]! text-md! font-semibold! leading-tighter! tracking-[0.1px]!',
                description: 'text-text-primary! text-sm! mt-px!',
                icon: 'ml-0!',
              },
              style: {
                alignItems: 'flex-start',
                maxWidth:
                  'min(290px, calc(100vw - 32px - var(--ghost-safe-area-inset-left, 0px) - var(--ghost-safe-area-inset-right, 0px)))',
              },
            }}
            closeButton
          />
        </ShadeScope>,
        host,
      )
    : null;
};

interface ShadeProviderProps {
  darkMode: boolean;
  admin7Design?: boolean;
  admin7Mobile?: boolean;
  controlShape?: ControlShape;
  /** Where toasts render instead of the page: an app's overlay, while a dialog is open there. */
  toasterContainer?: HTMLElement;
  children: React.ReactNode;
}

const ShadeProvider: React.FC<ShadeProviderProps> = ({
  darkMode,
  admin7Design = true,
  admin7Mobile = false,
  controlShape,
  toasterContainer,
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
        admin7Design,
        admin7Mobile,
        controlShape: controlShape ?? 'pill',
      }}
    >
      <GlobalDirtyStateProvider>
        {/* Default Radix tooltip timing for any Tooltip without a nearer
            provider; inner providers still win via nearest-provider scoping. */}
        <TooltipProvider>
          {children}
          <ToasterPortal container={toasterContainer} />
        </TooltipProvider>
      </GlobalDirtyStateProvider>
    </ShadeContext.Provider>
  );
};

export default ShadeProvider;
