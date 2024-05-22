import {act, renderHook} from '@testing-library/react';
import * as assert from 'assert/strict';
import useForm from '../../../src/hooks/useForm';

describe('useForm', function () {
    describe('formState', function () {
        it('returns the initial form state', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            assert.deepEqual(result.current.formState, {a: 1});
        });
    });

    describe('updateForm', function () {
        it('updates the form state', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => result.current.updateForm(state => ({...state, b: 2})));

            assert.deepEqual(result.current.formState, {a: 1, b: 2});
        });

        it('sets the saveState to unsaved', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => result.current.updateForm(state => ({...state, a: 2})));

            assert.deepEqual(result.current.saveState, 'unsaved');
        });
    });

    describe('handleSave', function () {
        it('does nothing when the state has not changed', async function () {
            let onSaveCalled = false;

            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {
                    onSaveCalled = true;
                }
            }));

            assert.equal(await act(() => result.current.handleSave()), true);

            assert.equal(result.current.saveState, '');
            assert.equal(onSaveCalled, false);
        });

        it('calls the onSave callback when the state has changed', async function () {
            let onSaveCalled = false;

            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {
                    onSaveCalled = true;
                }
            }));

            act(() => result.current.updateForm(state => ({...state, a: 2})));
            assert.equal(await act(() => result.current.handleSave()), true);

            assert.equal(result.current.saveState, 'saved');
            assert.equal(onSaveCalled, true);
        });
    });
});
