import { createContext, useContext } from 'react';

interface ShadeContextType {
  isAnyTextFieldFocused: boolean;
  setFocusState: (value: boolean) => void;
  darkMode: boolean;
  /** Admin's `admin7Design` Labs flag; see ShadeApp. */
  admin7Design: boolean;
  /** Temporary mobile-hardening switch, independent of admin7Design. */
  admin7Mobile: boolean;
  controlShape: ControlShape;
}

export type ControlShape = 'rounded' | 'pill';

export const ShadeContext = createContext<ShadeContextType>({
  isAnyTextFieldFocused: false,
  setFocusState: () => {},
  darkMode: false,
  admin7Design: true,
  admin7Mobile: false,
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
