import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createContext, useContext } from 'react';
import queryClient from '../queryClient';
import RoutingProvider, { ExternalLink } from './RoutingProvider';


export interface FrameworkProviderProps {
    basePath: string;
    ghostVersion: string;
    externalNavigate: (link: ExternalLink) => void;
    unsplashConfig: {
        Authorization: string;
        'Accept-Version': string;
        'Content-Type': string;
        'App-Pragma': string;
        'X-Unsplash-Cache': boolean;
    };
    sentryDSN: string | null;
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;

    children: ReactNode;
}

export type FrameworkContextType = Omit<FrameworkProviderProps, "basePath" | "externalNavigate" | "children">;

const FrameworkContext = createContext<FrameworkContextType>({
    ghostVersion: '',
    unsplashConfig: {
        Authorization: '',
        'Accept-Version': '',
        'Content-Type': '',
        'App-Pragma': '',
        'X-Unsplash-Cache': true
    },
    sentryDSN: null,
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {}
});

function FrameworkProvider({externalNavigate, basePath, children, ...props}: FrameworkProviderProps) {
    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <FrameworkContext.Provider value={props}>
                    <RoutingProvider basePath={basePath} externalNavigate={externalNavigate}>
                        {children}
                    </RoutingProvider>
                </FrameworkContext.Provider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export default FrameworkProvider;

export const useFramework = () => useContext(FrameworkContext)
