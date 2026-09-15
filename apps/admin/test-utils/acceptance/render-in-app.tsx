import { StrictMode, useState, type ReactNode } from 'react';
import { render } from 'vitest-browser-react';
import { FrameworkProvider } from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';

import '@/index.css';
import { useThemeContext } from '@/providers/theme-context';
import { ThemeProvider } from '@/providers/theme-provider';

import { createFrameworkProps } from './framework-props';

function ThemedShade({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useThemeContext();

  return (
    <ShadeApp className="shade-admin" darkMode={resolvedTheme === 'dark'}>
      {children}
    </ShadeApp>
  );
}

/**
 * The app's provider stack around a subject, minus the router and the routed
 * app itself — component-tier specs mount a component here rather than
 * booting a route. Use it as `renderHook`'s wrapper; `renderInApp` renders it.
 */
export function InAppProviders({ children }: { children: ReactNode }) {
  // One QueryClient per mount: created here, above StrictMode, so a re-render
  // never swaps the client out from under the subject.
  const [framework] = useState(createFrameworkProps);

  return (
    <StrictMode>
      <FrameworkProvider {...framework}>
        <ThemeProvider>
          <ThemedShade>{children}</ThemedShade>
        </ThemeProvider>
      </FrameworkProvider>
    </StrictMode>
  );
}

/** Mounts a subject in the app's provider stack, against the fake Ghost API. */
// eslint-disable-next-line react-refresh/only-export-components -- test harness module, never a fast-refresh target
export async function renderInApp(children: ReactNode) {
  return await render(<InAppProviders>{children}</InAppProviders>);
}
