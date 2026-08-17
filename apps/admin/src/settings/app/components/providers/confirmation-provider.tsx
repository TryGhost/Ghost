import React, {createContext, useCallback, useContext, useRef, useState} from 'react';
import {type ConfirmationModalProps, ConfirmationModalContent} from '@/settings/app/components/confirmation-modal';
import {type LimitModalProps, LimitModalContent} from '@/settings/app/components/limit-modal';

export type ConfirmationHandle = {remove: () => void};

type ConfirmationRequest =
    | {id: number; kind: 'confirm'; props: ConfirmationModalProps}
    | {id: number; kind: 'limit'; props: LimitModalProps};

type ConfirmationContextType = {
    confirm: (props: ConfirmationModalProps) => ConfirmationHandle;
    showLimit: (props: LimitModalProps) => ConfirmationHandle;
};

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export function useConfirmation(): ConfirmationContextType {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used inside ConfirmationProvider');
    }
    return context;
}

export const ConfirmationProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
    const nextId = useRef(0);

    const show = useCallback((request: Omit<ConfirmationRequest, 'id'>): ConfirmationHandle => {
        nextId.current += 1;
        const id = nextId.current;
        // One request per kind, matching NiceModal's per-component keying: a
        // second show replaces the first instead of stacking (StrictMode
        // double-effects depend on this).
        setRequests(current => [...current.filter(r => r.kind !== request.kind), {...request, id} as ConfirmationRequest]);
        return {remove: () => setRequests(current => current.filter(r => r.id !== id))};
    }, []);

    const confirm = useCallback((props: ConfirmationModalProps) => show({kind: 'confirm', props}), [show]);
    const showLimit = useCallback((props: LimitModalProps) => show({kind: 'limit', props}), [show]);

    const contextValue = React.useMemo(() => ({confirm, showLimit}), [confirm, showLimit]);

    return (
        <ConfirmationContext.Provider value={contextValue}>
            {children}
            {requests.map((request) => {
                const remove = () => setRequests(current => current.filter(r => r.id !== request.id));
                return request.kind === 'confirm' ?
                    <ConfirmationModalContent key={request.id} {...request.props} onRemove={remove} /> :
                    <LimitModalContent key={request.id} {...request.props} onRemove={remove} />;
            })}
        </ConfirmationContext.Provider>
    );
};
