import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {usePinturaEditor} from './use-pintura-editor';

const {mockUsePinturaConfig} = vi.hoisted(() => ({
    mockUsePinturaConfig: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
    usePinturaConfig: mockUsePinturaConfig
}));

describe('usePinturaEditor', () => {
    let processHandler: ((result: {dest: File}) => void) | undefined;
    const openDefaultEditor = vi.fn((_options: {src: string}) => ({
        on: (event: string, callback: (result: {dest: File}) => void) => {
            if (event === 'process') {
                processHandler = callback;
            }
        }
    }));

    beforeEach(() => {
        mockUsePinturaConfig.mockReturnValue({
            jsUrl: 'https://cdn.example.com/pintura.js',
            cssUrl: 'https://cdn.example.com/pintura.css'
        });
        window.pintura = {openDefaultEditor};
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.example.com/pintura.css';
        document.head.appendChild(link);
    });

    afterEach(() => {
        vi.clearAllMocks();
        processHandler = undefined;
        document.head.querySelectorAll('link[href="https://cdn.example.com/pintura.css"]').forEach(link => link.remove());
        Reflect.deleteProperty(window, 'pintura');
    });

    it('opens the configured editor and passes the processed file to the save handler', async () => {
        const handleSave = vi.fn();
        const {result} = renderHook(() => usePinturaEditor());
        await waitFor(() => expect(result.current.isEnabled).toBe(true));

        act(() => result.current.openEditor({image: '/content/images/tag.jpg', handleSave}));

        expect(openDefaultEditor).toHaveBeenCalledOnce();
        const editedImageUrl = new URL(openDefaultEditor.mock.calls[0][0].src);
        expect(editedImageUrl.pathname).toBe('/content/images/tag.jpg');
        expect(editedImageUrl.searchParams.get('v')).toMatch(/^\d+$/);
        const edited = new File(['image'], 'edited.jpg', {type: 'image/jpeg'});
        act(() => processHandler?.({dest: edited}));
        expect(handleSave).toHaveBeenCalledWith(edited);
    });

    it('disables the editor when the integration is turned off', async () => {
        const {result, rerender} = renderHook(() => usePinturaEditor());
        await waitFor(() => expect(result.current.isEnabled).toBe(true));

        mockUsePinturaConfig.mockReturnValue(null);
        rerender();

        expect(result.current.isEnabled).toBe(false);
    });
});
