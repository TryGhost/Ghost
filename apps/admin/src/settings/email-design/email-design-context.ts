import { createContext, useContext } from 'react';
import type { EmailDesignSettings } from './types';

export interface EmailDesignContextValue {
  settings: EmailDesignSettings;
  onSettingsChange: (updates: Partial<EmailDesignSettings>) => void;
  accentColor: string;
}

export const EmailDesignContext = createContext<EmailDesignContextValue | undefined>(undefined);

export const useEmailDesign = (): EmailDesignContextValue => {
  const ctx = useContext(EmailDesignContext);
  if (!ctx) {
    throw new Error('useEmailDesign must be used within an EmailDesignProvider');
  }
  return ctx;
};
