import { act, renderHook } from '@testing-library/react';
import useForm from '../../../src/hooks/use-form';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useForm', () => {
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

  describe('formState', () => {
    it('returns the initial form state', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { a: 1 },
          onSave: () => {},
        }),
      );

      expect(result.current.formState).toEqual({ a: 1 });
    });
  });

  describe('updateForm', () => {
    it('updates the form state', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { a: 1 },
          onSave: () => {},
        }),
      );

      act(() => {
        result.current.updateForm((state) => ({ ...state, b: 2 }));
      });

      expect(result.current.formState).toEqual({ a: 1, b: 2 });
    });

    it('sets the saveState to unsaved', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { a: 1 },
          onSave: () => {},
        }),
      );

      act(() => {
        result.current.updateForm((state) => ({ ...state, a: 2 }));
      });

      expect(result.current.saveState).toBe('unsaved');
    });
  });

  describe('handleSave', () => {
    it('does nothing when the state has not changed', async () => {
      let onSaveCalled = false;

      const { result } = renderHook(() =>
        useForm({
          initialState: { a: 1 },
          onSave: () => {
            onSaveCalled = true;
          },
        }),
      );

      const success = await act(async () => {
        return await result.current.handleSave();
      });
      expect(success).toBe(true);

      expect(result.current.saveState).toBe('');
      expect(onSaveCalled).toBe(false);
    });

    it('calls the onSave callback when the state has changed', async () => {
      let onSaveCalled = false;

      const { result } = renderHook(() =>
        useForm({
          initialState: { a: 1 },
          onSave: () => {
            onSaveCalled = true;
          },
        }),
      );

      act(() => {
        result.current.updateForm((state) => ({ ...state, a: 2 }));
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
      const mockValidate = vi.fn().mockReturnValue({ field: 'Required field' });
      const mockOnSave = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: '' },
          onSave: mockOnSave,
          onValidate: mockValidate,
        }),
      );

      act(() => {
        result.current.updateForm((state) => ({ ...state, field: 'test' }));
      });

      const success = await act(async () => {
        return await result.current.handleSave();
      });

      expect(success).toBe(false);
      expect(result.current.saveState).toBe('error');
      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toEqual({ field: 'Required field' });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('passes validation and saves when valid', async () => {
      const mockValidate = vi.fn().mockReturnValue({});
      const mockOnSave = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: '' },
          onSave: mockOnSave,
          onValidate: mockValidate,
        }),
      );

      act(() => {
        result.current.updateForm((state) => ({ ...state, field: 'test' }));
      });

      const success = await act(async () => {
        return await result.current.handleSave();
      });

      expect(success).toBe(true);
      expect(result.current.saveState).toBe('saved');
      expect(result.current.isValid).toBe(true);
      expect(mockOnSave).toHaveBeenCalledWith({ field: 'test' });
    });

    it('validates manually', () => {
      const mockValidate = vi.fn().mockReturnValue({ field: 'Error' });

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: '' },
          onSave: vi.fn(),
          onValidate: mockValidate,
        }),
      );

      let isValid;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors).toEqual({ field: 'Error' });
    });

    it('clears individual field errors', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: '' },
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current.setErrors({ field1: 'Error 1', field2: 'Error 2' });
      });

      act(() => {
        result.current.clearError('field1');
      });

      expect(result.current.errors).toEqual({ field1: '', field2: 'Error 2' });
    });
  });

  describe('error handling', () => {
    it('handles save errors correctly', async () => {
      const mockError = new Error('Save failed');
      const mockOnSave = vi.fn().mockRejectedValue(mockError);
      const mockOnSaveError = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
          onSaveError: mockOnSaveError,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });

      try {
        await act(async () => {
          await result.current!.handleSave();
        });
      } catch {
        // Expected to throw
      }

      expect(result.current!.saveState).toBe('unsaved');
      expect(mockOnSaveError).toHaveBeenCalledWith(mockError);
    });

    it('handles async onSaveError', async () => {
      const mockError = new Error('Save failed');
      const mockOnSave = vi.fn().mockRejectedValue(mockError);
      const mockOnSaveError = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
          onSaveError: mockOnSaveError,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });

      try {
        await act(async () => {
          await result.current!.handleSave();
        });
      } catch {
        // Expected to throw
      }

      expect(mockOnSaveError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('async operations', () => {
    it('keeps edits made during a save unsaved until a second save', async () => {
      const pending = deferred();
      const onSave = vi.fn().mockReturnValueOnce(pending.promise);
      const onSavedStateReset = vi.fn();
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'initial' },
          onSave,
          onSavedStateReset,
        }),
      );

      act(() => result.current.updateForm(() => ({ field: 'Title A' })));
      let saving!: Promise<boolean>;
      act(() => {
        saving = result.current.handleSave();
      });
      expect(onSave).toHaveBeenCalledExactlyOnceWith({ field: 'Title A' });

      act(() => result.current.updateForm(() => ({ field: 'Title B' })));
      expect(result.current.formState).toEqual({ field: 'Title B' });
      expect(result.current.saveState).toBe('saving');
      expect(result.current.okProps.disabled).toBe(true);

      await act(async () => {
        pending.resolve();
        expect(await saving).toBe(false);
      });
      expect(result.current.saveState).toBe('unsaved');
      expect(result.current.okProps.disabled).toBe(false);
      act(() => vi.advanceTimersByTime(2000));
      expect(onSavedStateReset).not.toHaveBeenCalled();

      await act(async () => {
        expect(await result.current.handleSave()).toBe(true);
      });
      expect(onSave.mock.calls).toEqual([[{ field: 'Title A' }], [{ field: 'Title B' }]]);
      expect(result.current.saveState).toBe('saved');
    });

    it('keeps edits made during the saving delay unsaved', async () => {
      const onSave = vi.fn();
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'initial' },
          onSave,
          savingDelay: 500,
        }),
      );

      act(() => result.current.updateForm(() => ({ field: 'Title A' })));
      let saving!: Promise<boolean>;
      await act(async () => {
        saving = result.current.handleSave();
      });
      expect(onSave).toHaveBeenCalledExactlyOnceWith({ field: 'Title A' });
      expect(result.current.saveState).toBe('saving');

      act(() => result.current.updateForm(() => ({ field: 'Title B' })));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
        expect(await saving).toBe(false);
      });
      expect(result.current.formState).toEqual({ field: 'Title B' });
      expect(result.current.saveState).toBe('unsaved');
    });

    it('does not start or acknowledge another save while one is pending', async () => {
      const pending = deferred();
      const onSave = vi.fn().mockReturnValue(pending.promise);
      const { result } = renderHook(() => useForm({ initialState: { field: 'initial' }, onSave }));

      act(() => result.current.updateForm(() => ({ field: 'Title A' })));
      let saving!: Promise<boolean>;
      act(() => {
        saving = result.current.handleSave();
      });
      await act(async () => {
        expect(await result.current.handleSave()).toBe(false);
        expect(await result.current.handleSave({ force: true })).toBe(false);
        expect(await result.current.handleSave({ fakeWhenUnchanged: true })).toBe(false);
      });
      act(() => result.current.updateForm(() => ({ field: 'Title B' })));
      await act(async () => {
        expect(await result.current.handleSave()).toBe(false);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      await act(async () => {
        pending.resolve();
        expect(await saving).toBe(false);
      });
    });

    it.each(['resolve', 'reject'] as const)(
      'does not change reset state when a pending save ends with %s',
      async (outcome) => {
        const pending = deferred();
        const onSaveError = vi.fn();
        const { result } = renderHook(() =>
          useForm({
            initialState: { field: 'initial' },
            onSave: () => pending.promise,
            onSaveError,
          }),
        );

        act(() => result.current.updateForm(() => ({ field: 'Title A' })));
        let saving!: Promise<boolean>;
        act(() => {
          saving = result.current.handleSave();
        });
        act(() => result.current.reset());
        const error = new Error('Save failed');

        await act(async () => {
          if (outcome === 'reject') {
            pending.reject(error);
            await expect(saving).rejects.toBe(error);
          } else {
            pending.resolve();
            expect(await saving).toBe(false);
          }
        });
        expect(result.current.formState).toEqual({ field: 'initial' });
        expect(result.current.saveState).toBe('');
        expect(onSaveError).toHaveBeenCalledTimes(outcome === 'reject' ? 1 : 0);
      },
    );

    it('keeps edits made after resetting a pending save available for saving', async () => {
      const pending = deferred();
      const onSave = vi.fn().mockReturnValueOnce(pending.promise);
      const { result } = renderHook(() => useForm({ initialState: { field: 'initial' }, onSave }));

      act(() => result.current.updateForm(() => ({ field: 'Title A' })));
      let saving!: Promise<boolean>;
      act(() => {
        saving = result.current.handleSave();
      });
      act(() => result.current.reset());
      act(() => result.current.updateForm(() => ({ field: 'Title B' })));

      await act(async () => {
        pending.resolve();
        expect(await saving).toBe(false);
      });
      expect(result.current.formState).toEqual({ field: 'Title B' });
      expect(result.current.saveState).toBe('unsaved');

      await act(async () => {
        expect(await result.current.handleSave()).toBe(true);
      });
      expect(onSave).toHaveBeenLastCalledWith({ field: 'Title B' });
    });

    it('cancels the saved callback when another edit is made', async () => {
      const onSavedStateReset = vi.fn();
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'initial' },
          onSave: vi.fn(),
          savedDelay: 100,
          onSavedStateReset,
        }),
      );

      act(() => result.current.updateForm(() => ({ field: 'Title A' })));
      await act(async () => {
        await result.current.handleSave();
      });
      act(() => result.current.updateForm(() => ({ field: 'Title B' })));
      act(() => vi.advanceTimersByTime(100));

      expect(result.current.saveState).toBe('unsaved');
      expect(onSavedStateReset).not.toHaveBeenCalled();
    });

    it('shows saving state during async save', async () => {
      let resolveOnSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveOnSave = resolve;
      });
      const mockOnSave = vi.fn().mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
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

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
          savedDelay: 100,
          onSavedStateReset: mockOnSavedStateReset,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
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

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
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
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current!.setFormState((state) => ({ ...state, field: 'updated' }));
      });

      expect(result.current!.formState).toEqual({ field: 'updated' });
      expect(result.current!.saveState).toBe('');
    });

    it('updateForm marks form as dirty', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });

      expect(result.current!.formState).toEqual({ field: 'updated' });
      expect(result.current!.saveState).toBe('unsaved');
    });
  });

  describe('reset functionality', () => {
    it('resets to initial state', () => {
      const initialState = { field: 'initial' };
      const { result } = renderHook(() =>
        useForm({
          initialState,
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
        result.current!.setErrors({ field: 'Some error' });
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

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
        }),
      );

      const success = await act(async () => {
        return await result.current!.handleSave({ force: true });
      });

      expect(success).toBe(true);
      expect(mockOnSave).toHaveBeenCalledWith({ field: 'test' });
    });

    it('fakes save when unchanged and fakeWhenUnchanged is true', async () => {
      const mockOnSave = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
        }),
      );

      const success = await act(async () => {
        return await result.current!.handleSave({ fakeWhenUnchanged: true });
      });

      expect(success).toBe(true);
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(result.current!.saveState).toBe('saved');
    });
  });

  describe('okProps', () => {
    it('returns correct okProps for unsaved state', () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });

      expect(result.current!.okProps).toEqual({
        disabled: false,
        variant: 'default',
        label: undefined,
      });
    });

    it('returns correct okProps for saving state', () => {
      const savePromise = new Promise<void>(() => {
        // Never resolve to keep in saving state
      });
      const mockOnSave = vi.fn().mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: mockOnSave,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });

      // Start save but don't wait for completion
      act(() => {
        result.current!.handleSave();
      });

      // Check that we're in saving state
      expect(result.current!.okProps).toEqual({
        disabled: true,
        variant: 'default',
        label: 'Saving...',
      });
    });

    it('returns correct okProps for saved state', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: vi.fn(),
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });
      await act(async () => {
        await result.current!.handleSave();
      });

      expect(result.current!.okProps).toEqual({
        disabled: false,
        variant: 'default',
        label: 'Saved',
      });
    });

    it('returns correct okProps for error state', async () => {
      const mockValidate = vi.fn().mockReturnValue({ field: 'Error' });

      const { result } = renderHook(() =>
        useForm({
          initialState: { field: 'test' },
          onSave: vi.fn(),
          onValidate: mockValidate,
        }),
      );

      act(() => {
        result.current!.updateForm((state) => ({ ...state, field: 'updated' }));
      });
      await act(async () => {
        await result.current!.handleSave();
      });

      expect(result.current!.okProps).toEqual({
        disabled: false,
        variant: 'destructive',
        label: 'Retry',
      });
    });
  });
});
