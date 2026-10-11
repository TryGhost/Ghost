import { createContext, useContext } from 'react';

interface ShadeContextType {
  isAnyTextFieldFocused: boolean;
  setFocusState: (value: boolean) => void;
  darkMode: boolean;
  isAdmin7: boolean;
  controlShape: ControlShape;
}

export type ControlShape = 'rounded' | 'pill';

export const ShadeContext = createContext<ShadeContextType>({
  isAnyTextFieldFocused: false,
  setFocusState: () => {},
  darkMode: false,
  isAdmin7: true,
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
