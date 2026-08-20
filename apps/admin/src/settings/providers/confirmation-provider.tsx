import React, {useCallback, useRef, useState} from 'react';
import {type ConfirmationHandle, ConfirmationContext} from './confirmation-context';
import {type ConfirmationModalProps, ConfirmationModalContent} from '@/settings/components/confirmation-modal';
import {type LimitModalProps, LimitModalContent} from '@/settings/components/limit-modal';

type ConfirmationRequest =
    | {id: number; kind: 'confirm'; props: ConfirmationModalProps}
    | {id: number; kind: 'limit'; props: LimitModalProps};

export const ConfirmationProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
    const nextId = useRef(0);

    const show = useCallback((request: Omit<ConfirmationRequest, 'id'>): ConfirmationHandle => {
        nextId.current += 1;
        const id = nextId.current;
        // One request per kind: a second show replaces the first instead of
        // stacking (StrictMode double-effects depend on this).
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
