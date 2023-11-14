import {ErrorBoundary as SentryErrorBoundary} from '@sentry/react';
import {QueryClientProvider} from '@tanstack/react-query';
import {ReactNode, createContext, useContext} from 'react';
import queryClient from '../utils/queryClient';
import RoutingProvider, {RoutingProviderProps} from './RoutingProvider';

export interface FrameworkProviderProps {
    basePath: string;
    ghostVersion: string;
    externalNavigate: RoutingProviderProps['externalNavigate'];
    modals: RoutingProviderProps['modals'];
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

export type FrameworkContextType = Omit<FrameworkProviderProps, 'basePath' | 'externalNavigate' | 'modals' | 'children'>;

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

function FrameworkProvider({externalNavigate, basePath, modals, children, ...props}: FrameworkProviderProps) {
    return (
        <SentryErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <FrameworkContext.Provider value={props}>
                    <RoutingProvider basePath={basePath} externalNavigate={externalNavigate} modals={modals}>
                        {children}
                    </RoutingProvider>
                </FrameworkContext.Provider>
            </QueryClientProvider>
        </SentryErrorBoundary>
    );
}

export default FrameworkProvider;

export const useFramework = () => useContext(FrameworkContext);
