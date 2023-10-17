import * as assert from 'assert/strict';
import useForm from '../../../src/hooks/useForm';
import {act, renderHook} from '@testing-library/react';

describe('useForm', function () {
    describe('formState', () => {
        it('returns the initial form state', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            assert.deepStrictEqual(result.current.formState, {a: 1});
        });
    });

    describe('updateForm', () => {
        it('updates the form state', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => result.current.updateForm(state => ({...state, b: 2})));

            assert.deepStrictEqual(result.current.formState, {a: 1, b: 2});
        });

        it('sets the saveState to unsaved', function () {
            const {result} = renderHook(() => useForm({
                initialState: {a: 1},
                onSave: () => {}
            }));

            act(() => result.current.updateForm(state => ({...state, a: 2})));

            assert.deepStrictEqual(result.current.saveState, 'unsaved');
        });
    });

    describe('handleSave', () => {
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
