import { createContext, useContext } from 'react';

export const AdminPageChromeContext = createContext(false);

export function useAdminPageChrome() {
  return useContext(AdminPageChromeContext);
}
