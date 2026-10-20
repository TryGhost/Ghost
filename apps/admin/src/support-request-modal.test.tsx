import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportRequestModal } from './support-request-modal';
import type { SupportRequestDraft } from './support-request';

const { mockSubmit, mockHandleError, mockUseCurrentUser } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockHandleError: vi.fn(),
  mockUseCurrentUser: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/support-requests', () => ({
  useSendSupportRequest: () => ({ mutateAsync: mockSubmit }),
}));

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
    '@tryghost/admin-x-framework/hooks',
  );

  return {
    ...actual,
    useHandleError: () => mockHandleError,
  };
});

vi.mock('@tryghost/admin-x-framework/api/current-user', async () => {
  const actual = await vi.importActual<
    typeof import('@tryghost/admin-x-framework/api/current-user')
  >('@tryghost/admin-x-framework/api/current-user');

  return {
    ...actual,
    useCurrentUser: () => mockUseCurrentUser() as { data?: { name: string; email: string } },
  };
});

const draft: SupportRequestDraft = {
  name: 'Jamie Larson',
  email: 'jamie@example.com',
  subject: 'Cannot publish a post',
  message: 'I still cannot publish after checking permissions.',
  source: 'chat-provider',
  pageUrl: 'http://localhost:2368/ghost/#/posts',
  conversationUrl: 'https://chat.example.com/conversation/conv-1',
  transcript: '**User**\nI cannot publish a post',
};

function renderModal(overrides: Partial<ComponentProps<typeof SupportRequestModal>> = {}) {
  const onSent = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <SupportRequestModal
      draft={draft}
      open
      onOpenChange={onOpenChange}
      onSent={onSent}
      {...overrides}
    />,
  );

  return { onSent, onOpenChange };
}

describe('SupportRequestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSubmit.mockResolvedValue(undefined);

    mockUseCurrentUser.mockReturnValue({
      data: { name: 'Fallback Name', email: 'fallback@example.com' },
    });
  });

  it('prefills name, email, subject, and message from the draft', () => {
    renderModal();

    expect(screen.getByLabelText('Name')).toHaveValue('Jamie Larson');
    expect(screen.getByLabelText('Email')).toHaveValue('jamie@example.com');
    expect(screen.getByLabelText('Subject')).toHaveValue('Cannot publish a post');
    expect(screen.getByLabelText('Message')).toHaveValue(
      'I still cannot publish after checking permissions.',
    );
  });

  it('falls back to the current user when the draft has no identity', () => {
    renderModal({
      draft: { ...draft, name: undefined, email: undefined },
    });

    expect(screen.getByLabelText('Name')).toHaveValue('Fallback Name');
    expect(screen.getByLabelText('Email')).toHaveValue('fallback@example.com');
  });

  it('only mentions the attached conversation when there is a transcript', () => {
    renderModal({ draft: { ...draft, transcript: undefined } });

    expect(
      screen.queryByText('Your conversation will be attached automatically.'),
    ).not.toBeInTheDocument();
  });

  it('validates empty fields and an invalid email', async () => {
    mockUseCurrentUser.mockReturnValue({ data: undefined });

    renderModal({
      draft: { source: 'chat-provider', pageUrl: draft.pageUrl },
    });

    fireEvent.click(screen.getByTestId('support-request-send'));

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter a subject')).toBeInTheDocument();
    expect(screen.getByText('Enter a message')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jamie' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Help' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please help' } });
    fireEvent.click(screen.getByTestId('support-request-send'));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('rejects fields longer than the endpoint accepts', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'a'.repeat(256) } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'a'.repeat(10_001) } });
    fireEvent.click(screen.getByTestId('support-request-send'));

    expect(
      await screen.findByText('Subject cannot be longer than 255 characters'),
    ).toBeInTheDocument();
    expect(screen.getByText('Message cannot be longer than 10,000 characters')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the visible fields plus the draft context', async () => {
    const { onSent, onOpenChange } = renderModal();

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'I still cannot publish after checking permissions.\n\nUsing Chrome.' },
    });
    fireEvent.click(screen.getByTestId('support-request-send'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Jamie Larson',
      email: 'jamie@example.com',
      subject: 'Cannot publish a post',
      message: 'I still cannot publish after checking permissions.\n\nUsing Chrome.',
      source: 'chat-provider',
      pageUrl: 'http://localhost:2368/ghost/#/posts',
      conversationUrl: 'https://chat.example.com/conversation/conv-1',
      transcript: '**User**\nI cannot publish a post',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open and does not call onSent when sending fails', async () => {
    mockSubmit.mockRejectedValue(new Error('Something went wrong'));

    const { onSent, onOpenChange } = renderModal();

    fireEvent.click(screen.getByTestId('support-request-send'));

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });
});
