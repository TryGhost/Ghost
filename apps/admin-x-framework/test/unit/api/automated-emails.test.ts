import { act } from '@testing-library/react';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import {
  useAddAutomatedEmail,
  useEditAutomatedEmail,
  type AutomatedEmail,
} from '../../../src/api/automated-emails';
import { withMockFetch } from '../../utils/mock-fetch';

const email: AutomatedEmail = {
  id: 'email-id',
  name: 'Free member welcome flow',
  slug: 'member-welcome-email-free',
  status: 'active',
  subject: 'Welcome!',
  lexical: null,
  sender_name: null,
  sender_email: null,
  sender_reply_to: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
};

describe('automated email APIs', () => {
  describe('useAddAutomatedEmail', () => {
    it('sends the creation payload', async () => {
      await withMockFetch({ json: { automated_emails: [email] } }, async (mock) => {
        const { result } = renderHookWithProviders(() => useAddAutomatedEmail());
        await act(async () => {
          await result.current.mutateAsync(email);
        });
        const request = mock.calls.find(
          ([, options]: [unknown, RequestInit]) => options.method === 'POST',
        );
        expect(request[0]).toBe('http://localhost:3000/ghost/api/admin/automated_emails/');
        expect(JSON.parse(request[1].body)).toEqual({ automated_emails: [email] });
      });
    });
  });

  describe('useEditAutomatedEmail', () => {
    it('sends the update payload', async () => {
      await withMockFetch({ json: { automated_emails: [email] } }, async (mock) => {
        const { result } = renderHookWithProviders(() => useEditAutomatedEmail());
        await act(async () => {
          await result.current.mutateAsync(email);
        });
        const request = mock.calls.find(
          ([, options]: [unknown, RequestInit]) => options.method === 'PUT',
        );
        const expectedEmail: Partial<AutomatedEmail> = { ...email };
        delete expectedEmail.slug;
        expect(request[0]).toBe('http://localhost:3000/ghost/api/admin/automated_emails/email-id/');
        expect(JSON.parse(request[1].body)).toEqual({
          automated_emails: [expectedEmail],
        });
      });
    });
  });
});
