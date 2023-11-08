import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, createContext, useContext } from 'react';
import RoutingProvider, { ExternalLink } from './RoutingProvider';

export interface UpgradeStatusType {
    isRequired: boolean;
    message: string;
}

export interface FrameworkProviderProps {
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
    upgradeStatus?: UpgradeStatusType;

    children: ReactNode;
}

export type FrameworkContextType = Omit<FrameworkProviderProps, "externalNavigate" | "children">;

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
    onDelete: () => {},
    upgradeStatus: {
        isRequired: false,
        message: ''
    }
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * (60 * 1000), // 5 mins
            cacheTime: 10 * (60 * 1000), // 10 mins
            // We have custom retry logic for specific errors in fetchApi()
            retry: false
        }
    }
});

function FrameworkProvider({externalNavigate, children, ...props}: FrameworkProviderProps) {
    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <FrameworkContext.Provider value={props}>
                    <RoutingProvider externalNavigate={externalNavigate}>
                        {children}
                    </RoutingProvider>
                </FrameworkContext.Provider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export default FrameworkProvider;

export const useFramework = () => useContext(FrameworkContext)
