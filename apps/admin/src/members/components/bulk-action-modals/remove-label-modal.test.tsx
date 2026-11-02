import { RemoveLabelModal } from '@/members/components/bulk-action-modals/remove-label-modal';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const labels = [
  { id: 'label-1', name: 'alpha', slug: 'alpha' },
  { id: 'label-2', name: 'zeta', slug: 'zeta' },
];
const pickerOptionsRef: { current: { onSelectionChange: (slugs: string[]) => void } | null } = {
  current: null,
};

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
  useBrowseMembers: () => ({ data: { members: [{ id: 'member-1', labels }] }, isLoading: false }),
}));

vi.mock('@/members/hooks/use-label-picker', () => ({
  useLabelPicker: (options: { onSelectionChange: (slugs: string[]) => void }) => {
    pickerOptionsRef.current = options;
    return {
      labels,
      optionSource: { options: [], isInitialLoad: false },
      resolvedSelectedLabels: [],
      toggleLabel: vi.fn(),
      editLabel: vi.fn(),
      deleteLabel: vi.fn(),
    };
  },
}));

vi.mock('@/members/label-picker', () => ({
  LabelPicker: () => null,
}));

describe('RemoveLabelModal', () => {
  it('does not confirm several labels once removing several is no longer allowed', () => {
    const onConfirm = vi.fn();
    const props = { open: true, memberCount: 2, onOpenChange: vi.fn(), onConfirm };
    const { rerender } = render(<RemoveLabelModal {...props} allowMultiple />);

    act(() => {
      pickerOptionsRef.current?.onSelectionChange(['alpha', 'zeta']);
    });
    rerender(<RemoveLabelModal {...props} allowMultiple={false} />);

    const button = screen.getByRole('button', { name: 'Remove 2 labels' });
    expect(button).toBeDisabled();
    button.click();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
