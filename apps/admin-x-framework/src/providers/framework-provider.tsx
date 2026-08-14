import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ReactNode, createContext, useContext, useMemo} from 'react';
import queryClient from '../utils/query-client';
import {ExternalLink} from './routing-provider';

// Stats-specific configuration
export interface StatsConfig {
    endpoint?: string;
    endpointBrowser?: string;
    id?: string;
    token?: string;
    version?: string;
    local?: {
        enabled?: boolean;
        endpoint?: string;
        token?: string;
    };
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

    // Optional QueryClient override. Defaults to the shared window-level
    // singleton; test harnesses pass a fresh client per render for isolation.
    queryClient?: QueryClient;

    // Optional QueryClient configuration for apps that need different defaults
    queryClientOptions?: {
        staleTime?: number;
        refetchOnMount?: boolean;
        refetchOnWindowFocus?: boolean;
    };

    children: ReactNode;
}

export type TopLevelFrameworkProps = Omit<FrameworkProviderProps, 'children'>;

export type FrameworkContextType = Omit<FrameworkProviderProps, 'children'>;

const FrameworkContext = createContext<FrameworkContextType>({
    ghostVersion: '',
    externalNavigate: () => {},
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

export function FrameworkProvider({children, queryClient: queryClientOverride, queryClientOptions, ...props}: FrameworkProviderProps) {
    const client = useMemo(() => {
        if (queryClientOverride) {
            return queryClientOverride;
        }

        if (!queryClientOptions) {
            return queryClient;
        }

        return new QueryClient({
            defaultOptions: {
                queries: {
                    refetchOnWindowFocus: queryClientOptions.refetchOnWindowFocus ?? false,
                    staleTime: queryClientOptions.staleTime ?? 5 * (60 * 1000), // 5 mins
                    refetchOnMount: queryClientOptions.refetchOnMount ?? false,
                    gcTime: 10 * (60 * 1000), // 10 mins
                    // We have custom retry logic for specific errors in fetchApi()
                    retry: false,
                    networkMode: 'always'
                }
            }
        });
    }, [queryClientOverride, queryClientOptions]);

    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={client}>
                <FrameworkContext.Provider value={props}>
                    {children}
                </FrameworkContext.Provider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export const useFramework = () => useContext(FrameworkContext);
