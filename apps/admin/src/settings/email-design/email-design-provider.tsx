import { type ReactNode } from 'react';
import { EmailDesignContext, type EmailDesignContextValue } from './email-design-context';

interface EmailDesignProviderProps extends EmailDesignContextValue {
  children: ReactNode;
}

export const EmailDesignProvider = ({
  settings,
  onSettingsChange,
  accentColor,
  children,
}: EmailDesignProviderProps) => (
  <EmailDesignContext.Provider value={{ settings, onSettingsChange, accentColor }}>
    {children}
  </EmailDesignContext.Provider>
);
