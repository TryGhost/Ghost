import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {QueryClientProvider} from '@tanstack/react-query';
import {ReactNode, createContext, useContext} from 'react';
import queryClient from '../utils/queryClient';
import {ExternalLink} from './RoutingProvider';

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

export function FrameworkProvider({children, ...props}: FrameworkProviderProps) {
    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <FrameworkContext.Provider value={props}>
                    {children}
                </FrameworkContext.Provider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export const useFramework = () => useContext(FrameworkContext);
