import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocsBotSupportRequest } from '@tryghost/admin-x-framework';
import { DocsBotSupportTicketModal } from './docsbot-support-ticket-modal';
import { DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE } from './docsbot-support-ticket';

const { mockSubmit, mockHandleError, mockUseBrowseSite, mockUseCurrentUser } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockHandleError: vi.fn(),
  mockUseBrowseSite: vi.fn(),
  mockUseCurrentUser: vi.fn(),
}));

vi.mock('./docsbot-support-ticket', async () => {
  const actual = await vi.importActual<typeof import('./docsbot-support-ticket')>(
    './docsbot-support-ticket',
  );
  return {
    ...actual,
    submitDocsBotSupportTicket: mockSubmit,
  };
});

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
    '@tryghost/admin-x-framework/hooks',
  );
  return {
    ...actual,
    useHandleError: () => mockHandleError,
  };
});

vi.mock('@tryghost/admin-x-framework/api/site', async () => {
  const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/site')>(
    '@tryghost/admin-x-framework/api/site',
  );
  return {
    ...actual,
    useBrowseSite: () => mockUseBrowseSite() as { data?: { site: { url: string } } },
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

const supportRequest: DocsBotSupportRequest = {
  history: [
    { Human: 'I cannot publish a post', timestamp: '2025-05-08T22:56:28.514357' },
    { AI: 'Have you checked your permissions?', timestamp: '2025-05-08T22:56:30.645700' },
  ],
  metadata: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    conversationId: 'conv-1',
    conversationUrl: 'https://docsbot.ai/conversation/conv-1',
  },
  ticket: {
    subject: 'Cannot publish a post',
    message: 'I still cannot publish after checking permissions.',
  },
  currentUrl: 'http://localhost:2368/ghost/#/posts',
};

function renderModal(overrides: Partial<ComponentProps<typeof DocsBotSupportTicketModal>> = {}) {
  const addBotMessage = vi.fn().mockResolvedValue(undefined);
  const openWidget = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();

  render(
    <DocsBotSupportTicketModal
      addBotMessage={addBotMessage}
      openWidget={openWidget}
      supportRequest={supportRequest}
      open
      onOpenChange={onOpenChange}
      {...overrides}
    />,
  );

  return { addBotMessage, openWidget, onOpenChange };
}

describe('DocsBotSupportTicketModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockUseBrowseSite.mockReturnValue({
      data: { site: { url: 'https://example.com/' } },
    });
    mockUseCurrentUser.mockReturnValue({
      data: { name: 'Fallback Name', email: 'fallback@example.com' },
    });
  });

  it('prefills name, email, subject, and message from metadata and ticket', () => {
    renderModal();

    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Subject')).toHaveValue('Cannot publish a post');
    expect(screen.getByLabelText('Message')).toHaveValue(
      'I still cannot publish after checking permissions.',
    );
  });

  it('falls back to the current user when metadata has no identity', () => {
    renderModal({
      supportRequest: {
        ...supportRequest,
        metadata: { conversationId: 'conv-1' },
      },
    });

    expect(screen.getByLabelText('Name')).toHaveValue('Fallback Name');
    expect(screen.getByLabelText('Email')).toHaveValue('fallback@example.com');
  });

  it('validates empty fields and an invalid email', async () => {
    mockUseCurrentUser.mockReturnValue({ data: undefined });

    renderModal({
      supportRequest: {
        ...supportRequest,
        metadata: {},
        ticket: null,
      },
    });

    fireEvent.click(screen.getByTestId('docsbot-support-send'));

    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter a subject')).toBeInTheDocument();
    expect(screen.getByText('Enter a message')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Help' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please help' } });
    fireEvent.click(screen.getByTestId('docsbot-support-send'));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits the visible fields plus hidden conversation context', async () => {
    const { addBotMessage, openWidget, onOpenChange } = renderModal();

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'I still cannot publish after checking permissions.\n\nUsing Chrome.' },
    });
    fireEvent.click(screen.getByTestId('docsbot-support-send'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Cannot publish a post',
      message: 'I still cannot publish after checking permissions.\n\nUsing Chrome.',
      history: [
        '**User** (8 May 2025, 22:56)',
        'I cannot publish a post',
        '',
        '**Assistant** (8 May 2025, 22:56)',
        'Have you checked your permissions?',
      ].join('\n'),
      rawHistory: supportRequest.history,
      siteUrl: 'https://example.com/',
      currentUrl: 'http://localhost:2368/ghost/#/posts',
      metadata: supportRequest.metadata,
    });
    expect(addBotMessage).toHaveBeenCalledWith(DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(openWidget).toHaveBeenCalledTimes(1);
  });
});
