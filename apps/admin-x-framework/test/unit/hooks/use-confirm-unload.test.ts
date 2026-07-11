import {renderHook} from '@testing-library/react';
import {useConfirmUnload} from '../../../src/hooks/use-confirm-unload';

const runListener = (listener: null | EventListenerOrEventListenerObject, event: any) => {
    if (typeof listener === 'function') {
        listener(event);
    } else if (listener) {
        listener.handleEvent(event);
    }
};

describe('useConfirmUnload', () => {
    let listener: null | EventListenerOrEventListenerObject = null;

    beforeEach(() => {
        listener = null;

        vi.spyOn(window, 'addEventListener').mockImplementation((type, newListener) => {
            expect(type, 'test only supports beforeunload').toBe('beforeunload');
            expect(listener, 'multiple listeners should not be added').toBe(null);
            listener = newListener;
        });

        vi.spyOn(window, 'removeEventListener').mockImplementation((type, listenerToRemove) => {
            expect(type, 'test only supports beforeunload').toBe('beforeunload');
            expect(listenerToRemove, 'removing the wrong listener').toBe(listener);
            listener = null;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not add a beforeunload handler when confirmation is disabled', () => {
        renderHook(() => useConfirmUnload(false));

        expect(listener).toBeNull();
    });

    it('adds a beforeunload handler that discourages navigation when confirmation is enabled', () => {
        renderHook(() => useConfirmUnload(true));

        expect(listener).not.toBeNull();

        const event = {
            preventDefault: vi.fn(),
            returnValue: undefined
        };
        runListener(listener, event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.returnValue).toBe('');
    });

    it('removes the beforeunload handler when confirmation is disabled after being enabled', () => {
        const {rerender} = renderHook(({shouldConfirmUnload}) => useConfirmUnload(shouldConfirmUnload), {
            initialProps: {shouldConfirmUnload: true}
        });
        expect(listener, 'test setup').not.toBeNull();

        rerender({shouldConfirmUnload: false});

        expect(listener).toBeNull();
    });

    it('removes the beforeunload handler on unmount', () => {
        const {unmount} = renderHook(() => useConfirmUnload(true));
        expect(listener, 'test setup').not.toBeNull();

        unmount();

        expect(listener).toBeNull();
    });
});
