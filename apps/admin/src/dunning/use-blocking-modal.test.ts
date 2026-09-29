import { afterEach, describe, expect, test } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useBlockingModal } from './use-blocking-modal';

describe('useBlockingModal', () => {
  const added: Element[] = [];

  const addModalMarker = (build: (element: HTMLDivElement) => void): HTMLDivElement => {
    const element = document.createElement('div');
    build(element);
    document.body.appendChild(element);
    added.push(element);
    return element;
  };

  afterEach(() => {
    added.splice(0).forEach((element) => element.remove());
    document.body.style.pointerEvents = '';
  });

  test('reports no blocking modal on a clean page', () => {
    const { result } = renderHook(() => useBlockingModal(true));

    expect(result.current).toBe(false);
  });

  test('reports a legacy Settings modal until its backdrop is removed', async () => {
    const backdrop = addModalMarker((element) => {
      element.id = 'modal-backdrop';
    });
    const { result } = renderHook(() => useBlockingModal(true));
    expect(result.current).toBe(true);

    backdrop.remove();

    await waitFor(() => expect(result.current).toBe(false));
  });

  test.each(['dialog', 'alertdialog'])(
    'reports an open %s until it leaves the open state',
    async (role) => {
      const dialog = addModalMarker((element) => {
        element.setAttribute('role', role);
        element.setAttribute('data-state', 'open');
      });
      const { result } = renderHook(() => useBlockingModal(true));
      expect(result.current).toBe(true);

      dialog.setAttribute('data-state', 'closed');

      await waitFor(() => expect(result.current).toBe(false));
    },
  );

  test('waits for the Radix pointer lock to release after the dialog closes', async () => {
    document.body.style.pointerEvents = 'none';
    const { result } = renderHook(() => useBlockingModal(true));
    expect(result.current).toBe(true);

    document.body.style.pointerEvents = '';

    await waitFor(() => expect(result.current).toBe(false));
  });

  test('notifies every consumer of the shared observer', async () => {
    const first = renderHook(() => useBlockingModal(true));
    const second = renderHook(() => useBlockingModal(true));

    addModalMarker((element) => {
      element.id = 'modal-backdrop';
    });

    await waitFor(() => expect(first.result.current).toBe(true));
    await waitFor(() => expect(second.result.current).toBe(true));
  });

  test('ignores every marker while disabled', () => {
    addModalMarker((element) => {
      element.id = 'modal-backdrop';
    });
    document.body.style.pointerEvents = 'none';

    const { result } = renderHook(() => useBlockingModal(false));

    expect(result.current).toBe(false);
  });
});
