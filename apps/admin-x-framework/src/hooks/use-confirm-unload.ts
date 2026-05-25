import * as React from 'react';

export function useConfirmUnload(shouldConfirmUnload: boolean): void {
    React.useEffect(() => {
        if (!shouldConfirmUnload) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [shouldConfirmUnload]);
}
