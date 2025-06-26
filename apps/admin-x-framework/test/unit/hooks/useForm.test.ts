import {act, renderHook} from '@testing-library/react';
import useForm from '../../../src/hooks/useForm';

// Mock timers for testing delays
beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe('useForm', () => {
    describe('formState', () => {
        it('returns the initial form state', () => {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            expect(result.current.formState).toEqual({a: 1});
        });
    });

    describe('updateForm', () => {
        it('updates the form state', () => {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => {
                result.current.updateForm(state => ({...state, b: 2}));
            });

            expect(result.current.formState).toEqual({a: 1, b: 2});
        });

        it('sets the saveState to unsaved', () => {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => {
                result.current.updateForm(state => ({...state, a: 2}));
            });

            expect(result.current.saveState).toBe('unsaved');
        });
    });

    describe('handleSave', () => {
        it('does nothing when the state has not changed', async () => {
            let onSaveCalled = false;

            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {
                    onSaveCalled = true;
                }
            }));

            const success = await act(async () => {
                return await result.current.handleSave();
            });
            expect(success).toBe(true);

            expect(result.current.saveState).toBe('');
            expect(onSaveCalled).toBe(false);
        });

        it('calls the onSave callback when the state has changed', async () => {
            let onSaveCalled = false;

            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {
                    onSaveCalled = true;
                }
            }));

            act(() => {
                result.current.updateForm(state => ({...state, a: 2}));
            });
            
            const success = await act(async () => {
                return await result.current.handleSave();
            });
            expect(success).toBe(true);

            expect(result.current.saveState).toBe('saved');
            expect(onSaveCalled).toBe(true);
        });
    });

    describe('validation', () => {
        it('validates form on save', async () => {
            const mockValidate = vi.fn().mockReturnValue({field: 'Required field'});
            const mockOnSave = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: ''},
                onSave: mockOnSave,
                onValidate: mockValidate
            }));

            act(() => {
                result.current.updateForm(state => ({...state, field: 'test'}));
            });
            
            const success = await act(async () => {
                return await result.current.handleSave();
            });
            
            expect(success).toBe(false);
            expect(result.current.saveState).toBe('error');
            expect(result.current.isValid).toBe(false);
            expect(result.current.errors).toEqual({field: 'Required field'});
            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('passes validation and saves when valid', async () => {
            const mockValidate = vi.fn().mockReturnValue({});
            const mockOnSave = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: ''},
                onSave: mockOnSave,
                onValidate: mockValidate
            }));

            act(() => {
                result.current.updateForm(state => ({...state, field: 'test'}));
            });
            
            const success = await act(async () => {
                return await result.current.handleSave();
            });
            
            expect(success).toBe(true);
            expect(result.current.saveState).toBe('saved');
            expect(result.current.isValid).toBe(true);
            expect(mockOnSave).toHaveBeenCalledWith({field: 'test'});
        });

        it('validates manually', () => {
            const mockValidate = vi.fn().mockReturnValue({field: 'Error'});
            
            const {result} = renderHook(() => useForm({
                initialState: {field: ''},
                onSave: vi.fn(),
                onValidate: mockValidate
            }));

            let isValid;
            act(() => {
                isValid = result.current.validate();
            });
            
            expect(isValid).toBe(false);
            expect(result.current.errors).toEqual({field: 'Error'});
        });

        it('clears individual field errors', () => {
            const {result} = renderHook(() => useForm({
                initialState: {field: ''},
                onSave: vi.fn()
            }));

            act(() => {
                result.current.setErrors({field1: 'Error 1', field2: 'Error 2'});
            });

            act(() => {
                result.current.clearError('field1');
            });
            
            expect(result.current.errors).toEqual({field1: '', field2: 'Error 2'});
        });
    });

    describe('error handling', () => {
        it('handles save errors correctly', async () => {
            const mockError = new Error('Save failed');
            const mockOnSave = vi.fn().mockRejectedValue(mockError);
            const mockOnSaveError = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave,
                onSaveError: mockOnSaveError
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });

            try {
                await act(async () => {
                    await result.current!.handleSave();
                });
            } catch (e) {
                // Expected to throw
            }
            
            expect(result.current!.saveState).toBe('unsaved');
            expect(mockOnSaveError).toHaveBeenCalledWith(mockError);
        });

        it('handles async onSaveError', async () => {
            const mockError = new Error('Save failed');
            const mockOnSave = vi.fn().mockRejectedValue(mockError);
            const mockOnSaveError = vi.fn().mockResolvedValue(undefined);
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave,
                onSaveError: mockOnSaveError
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });

            try {
                await act(async () => {
                    await result.current!.handleSave();
                });
            } catch (e) {
                // Expected to throw
            }
            
            expect(mockOnSaveError).toHaveBeenCalledWith(mockError);
        });
    });

    describe('async operations', () => {
        it('shows saving state during async save', async () => {
            let resolveOnSave: () => void;
            const savePromise = new Promise<void>((resolve) => {
                resolveOnSave = resolve;
            });
            const mockOnSave = vi.fn().mockReturnValue(savePromise);
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });

            // Start save but don't wait for completion
            act(() => {
                result.current!.handleSave();
            });
            
            // Should be in saving state
            expect(result.current!.saveState).toBe('saving');
            
            // Complete the save
            act(() => {
                resolveOnSave!();
            });
            
            // Wait for state to update
            await act(async () => {
                await savePromise;
            });
            
            expect(result.current!.saveState).toBe('saved');
            expect(mockOnSave).toHaveBeenCalled();
        });

        it('calls savedDelay callback when provided', async () => {
            const mockOnSave = vi.fn();
            const mockOnSavedStateReset = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave,
                savedDelay: 100,
                onSavedStateReset: mockOnSavedStateReset
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            
            await act(async () => {
                await result.current!.handleSave();
            });
            
            expect(result.current!.saveState).toBe('saved');
            
            // Advance time to trigger reset
            act(() => {
                vi.advanceTimersByTime(100);
            });
            
            expect(mockOnSavedStateReset).toHaveBeenCalled();
        });

        it('handles Promise-based onSave', async () => {
            const mockOnSave = vi.fn().mockResolvedValue(undefined);
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            
            const success = await act(async () => {
                return await result.current!.handleSave();
            });
            
            expect(success).toBe(true);
            expect(result.current!.saveState).toBe('saved');
        });
    });

    describe('setFormState vs updateForm', () => {
        it('setFormState does not mark form as dirty', () => {
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: vi.fn()
            }));

            act(() => {
                result.current!.setFormState(state => ({...state, field: 'updated'}));
            });
            
            expect(result.current!.formState).toEqual({field: 'updated'});
            expect(result.current!.saveState).toBe('');
        });

        it('updateForm marks form as dirty', () => {
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: vi.fn()
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            
            expect(result.current!.formState).toEqual({field: 'updated'});
            expect(result.current!.saveState).toBe('unsaved');
        });
    });

    describe('reset functionality', () => {
        it('resets to initial state', () => {
            const initialState = {field: 'initial'};
            const {result} = renderHook(() => useForm({
                initialState,
                onSave: vi.fn()
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
                result.current!.setErrors({field: 'Some error'});
            });
            
            act(() => {
                result.current!.reset();
            });
            
            expect(result.current!.formState).toEqual(initialState);
            expect(result.current!.saveState).toBe('');
        });
    });

    describe('force and fakeWhenUnchanged options', () => {
        it('saves unchanged state when force is true', async () => {
            const mockOnSave = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave
            }));

            const success = await act(async () => {
                return await result.current!.handleSave({force: true});
            });
            
            expect(success).toBe(true);
            expect(mockOnSave).toHaveBeenCalledWith({field: 'test'});
        });

        it('fakes save when unchanged and fakeWhenUnchanged is true', async () => {
            const mockOnSave = vi.fn();
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave
            }));

            const success = await act(async () => {
                return await result.current!.handleSave({fakeWhenUnchanged: true});
            });
            
            expect(success).toBe(true);
            expect(mockOnSave).not.toHaveBeenCalled();
            expect(result.current!.saveState).toBe('saved');
        });
    });

    describe('okProps', () => {
        it('returns correct okProps for unsaved state', () => {
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: vi.fn()
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            
            expect(result.current!.okProps).toEqual({
                disabled: false,
                color: 'black',
                label: undefined
            });
        });

        it('returns correct okProps for saving state', () => {
            const savePromise = new Promise<void>(() => {
                // Never resolve to keep in saving state
            });
            const mockOnSave = vi.fn().mockReturnValue(savePromise);
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: mockOnSave
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            
            // Start save but don't wait for completion
            act(() => {
                result.current!.handleSave();
            });
            
            // Check that we're in saving state
            expect(result.current!.okProps).toEqual({
                disabled: true,
                color: 'black',
                label: 'Saving...'
            });
        });

        it('returns correct okProps for saved state', async () => {
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: vi.fn()
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            await act(async () => {
                await result.current!.handleSave();
            });
            
            expect(result.current!.okProps).toEqual({
                disabled: false,
                color: 'green',
                label: 'Saved'
            });
        });

        it('returns correct okProps for error state', async () => {
            const mockValidate = vi.fn().mockReturnValue({field: 'Error'});
            
            const {result} = renderHook(() => useForm({
                initialState: {field: 'test'},
                onSave: vi.fn(),
                onValidate: mockValidate
            }));

            act(() => {
                result.current!.updateForm(state => ({...state, field: 'updated'}));
            });
            await act(async () => {
                await result.current!.handleSave();
            });
            
            expect(result.current!.okProps).toEqual({
                disabled: false,
                color: 'red',
                label: 'Retry'
            });
        });
    });
});
