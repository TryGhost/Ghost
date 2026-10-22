import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { deferred } from '@/utils/deferred';
import {
  configResponse,
  fakeAdminEndpoint,
  fakeInvites,
  renderAdminApp,
  type StaffInvite,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import { fakeStaffWorld, invite, role, user } from './staff.test-helpers';

async function openInviteModal() {
  await settingsScreen.users().getByRole('button', { name: 'Invite people' }).click();
  return settingsScreen.inviteUserModal();
}

describe('Staff invitations', () => {
  it('sends an invitation with Enter', async () => {
    const { boot } = fakeStaffWorld();
    const created = invite({ id: 'newinvite', email: 'newuser@test.com' });
    const pendingAdd = deferred<{ invites: StaffInvite[] }>();
    const addApi = fakeAdminEndpoint('POST', '/invites/', () => pendingAdd.promise);
    await renderAdminApp('/settings/staff', { boot });

    const modal = await openInviteModal();
    await modal.getByLabelText('Email address').fill(created.email);
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => addApi.requests.length).toBe(1);
    await expect.element(modal.getByRole('button', { name: 'Sending...' })).toBeDisabled();

    pendingAdd.resolve({ invites: [created] });
    await expect.element(settingsScreen.successToast()).toHaveTextContent('Invitation sent');
    await expect.element(modal).not.toBeInTheDocument();
  });

  it('validates duplicate addresses and sends a role-specific invitation', async () => {
    const owner = user('Owner');
    const author = user('Author');
    const existingInvite = invite();
    const { boot } = fakeStaffWorld({
      currentUser: owner,
      users: [owner, author],
      invites: [existingInvite],
    });
    const created = invite({ id: 'newinvite', email: 'newuser@test.com' });
    const addApi = fakeAdminEndpoint('POST', '/invites/', { invites: [created] });
    await renderAdminApp('/settings/staff', { boot });

    const modal = await openInviteModal();
    await modal.getByRole('button', { name: 'Send invitation' }).click();
    await expect.element(modal.getByText('Please enter a valid email address.')).toBeVisible();

    const emailInput = modal.getByLabelText('Email address');
    await userEvent.type(emailInput.element(), 'test');
    await expect(modal.getByText('Please enter a valid email address.')).toHaveCount(0);
    await modal.getByRole('button', { name: 'Send invitation' }).click();
    await expect.element(modal.getByText('Please enter a valid email address.')).toBeVisible();

    await emailInput.fill('');
    await userEvent.type(emailInput.element(), author.email);
    await expect(modal.getByText('Please enter a valid email address.')).toHaveCount(0);
    await modal.getByRole('button', { name: 'Send invitation' }).click();
    await expect
      .element(modal.getByText('A user with that email address already exists.'))
      .toBeVisible();

    await modal.getByLabelText('Email address').fill(existingInvite.email);
    await modal.getByRole('button', { name: 'Retry' }).click();
    await expect
      .element(modal.getByText('A user with that email address was already invited.'))
      .toBeVisible();

    await modal.getByLabelText('Email address').fill(created.email);
    await modal.getByRole('radio', { name: /^Author\b/ }).click();
    await modal.getByRole('button', { name: 'Retry' }).click();

    await expect.element(settingsScreen.successToast()).toHaveTextContent('Invitation sent');
    expect(addApi.lastRequest?.body).toEqual({
      invites: [
        {
          email: created.email,
          role_id: role('Author').id,
          expires: null,
          status: null,
          token: null,
        },
      ],
    });
    await expect
      .element(settingsScreen.users().getByText(created.email, { exact: true }))
      .toBeVisible();
    const createdItem = settingsScreen
      .users()
      .getByTestId('user-invite')
      .filter({ hasText: created.email });
    await expect.element(createdItem.getByText('Author', { exact: true })).toBeVisible();
  });

  it('shows server-side duplicate-user validation inline without an error toast', async () => {
    const { boot } = fakeStaffWorld();
    const addApi = fakeAdminEndpoint(
      'POST',
      '/invites/',
      {
        errors: [
          {
            type: 'ValidationError',
            message: 'Validation error, cannot save invite.',
            context: 'User is already registered.',
            property: 'email',
            code: 'USER_ALREADY_REGISTERED',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/settings/staff', { boot });

    const modal = await openInviteModal();
    await modal.getByLabelText('Email address').fill('existing-on-next-page@test.com');
    await modal.getByRole('radio', { name: /^Author\b/ }).click();
    await modal.getByRole('button', { name: 'Send invitation' }).click();

    await expect
      .element(modal.getByText('A user with that email address already exists.'))
      .toBeVisible();
    await expect(settingsScreen.errorToast()).toHaveCount(0);
    expect(addApi.requests).toHaveLength(1);
  });

  it('retains the legacy resend flow when invitation limits are absent', async () => {
    const existing = invite();
    const { boot } = fakeStaffWorld({ invites: [existing] });
    const deleteApi = fakeAdminEndpoint('DELETE', `/invites/${existing.id}/`, {});
    const addApi = fakeAdminEndpoint('POST', '/invites/', { invites: [existing] });
    await renderAdminApp('/settings/staff?tab=invited', { boot });

    const item = settingsScreen.users().getByTestId('user-invite');
    await item.hover();
    await item.getByRole('button', { name: 'Resend' }).click();

    await expect.element(settingsScreen.successToast()).toHaveTextContent('Invitation resent');
    expect(deleteApi.requests).toHaveLength(1);
    expect(addApi.lastRequest?.body).toMatchObject({
      invites: [{ email: existing.email, role_id: existing.role_id }],
    });
  });

  it('resends a limited invitation without revoking it first', async () => {
    const existing = invite();
    const { boot } = fakeStaffWorld({ invites: [existing] });
    const deleteApi = fakeAdminEndpoint('DELETE', `/invites/${existing.id}/`, {});
    const replacement = { ...existing, id: 'replacement-invite' };
    const revokeApi = fakeAdminEndpoint('DELETE', `/invites/${replacement.id}/`, {});
    const addApi = fakeAdminEndpoint('POST', '/invites/', { invites: [replacement] });
    const config = configResponse();
    config.config.hostSettings = {
      staffInvites: { maxStaff: 10, maxInvites: 15 },
    };
    await renderAdminApp('/settings/staff?tab=invited', {
      boot: {
        ...boot,
        browseConfig: { response: config },
      },
    });
    const item = settingsScreen.users().getByTestId('user-invite');
    await item.hover();
    await item.getByRole('button', { name: 'Resend' }).click();
    await expect.element(settingsScreen.successToast()).toHaveTextContent('Invitation resent');
    expect(deleteApi.requests).toHaveLength(0);
    expect(addApi.requests).toHaveLength(1);
    await expect.poll(() => settingsScreen.users().getByTestId('user-invite').all().length).toBe(1);
    await item.getByRole('button', { name: 'Revoke' }).click();
    await expect.poll(() => revokeApi.requests.length).toBe(1);
    await expect.element(settingsScreen.users().getByTestId('user-invite')).not.toBeInTheDocument();
  });

  it('offers an upgrade on rejected resends without a billing iframe URL', async () => {
    const existing = invite();
    const { boot } = fakeStaffWorld({ invites: [existing] });
    const config = configResponse();
    config.config.hostSettings = {
      billing: { enabled: true },
      staffInvites: { maxStaff: 10, maxInvites: 15 },
    };
    fakeAdminEndpoint(
      'POST',
      '/invites/',
      {
        errors: [
          {
            type: 'HostLimitError',
            message: 'Trial invitation allowance exhausted.',
          },
        ],
      },
      { status: 403 },
    );
    await renderAdminApp('/settings/staff?tab=invited', {
      boot: { ...boot, browseConfig: { response: config } },
    });
    const item = settingsScreen.users().getByTestId('user-invite');
    await item.hover();
    await item.getByRole('button', { name: 'Resend' }).click();
    const toast = settingsScreen.errorToast();
    await expect.element(toast).toHaveTextContent('Trial invitation allowance exhausted');
    await toast.getByRole('button', { name: 'Upgrade', exact: true }).click();
    await expect.poll(() => window.location.hash).toBe('#/pro');
  });

  it('preserves the invitation and displays the wait when a resend is rate limited', async () => {
    const existing = invite();
    const { boot } = fakeStaffWorld({ invites: [existing] });
    const deleteApi = fakeAdminEndpoint('DELETE', `/invites/${existing.id}/`, {});
    fakeAdminEndpoint(
      'POST',
      '/invites/',
      {
        errors: [
          {
            type: 'TooManyRequestsError',
            code: 'STAFF_INVITE_RATE_LIMIT',
            message: 'Too many invitation requests. Try again in 60 seconds.',
          },
        ],
      },
      { status: 429 },
    );
    const config = configResponse();
    config.config.hostSettings = {
      staffInvites: { maxStaff: 10, maxInvites: 15 },
    };
    await renderAdminApp('/settings/staff?tab=invited', {
      boot: {
        ...boot,
        browseConfig: { response: config },
      },
    });

    const item = settingsScreen.users().getByTestId('user-invite');
    await item.hover();
    await item.getByRole('button', { name: 'Resend' }).click();

    await expect.element(settingsScreen.errorToast()).toHaveTextContent('Try again in 60 seconds.');
    await expect.element(item.getByText(existing.email)).toBeVisible();
    expect(deleteApi.requests).toHaveLength(0);
  });

  it('revokes an invitation and removes it from the list', async () => {
    const existing = invite();
    const { boot } = fakeStaffWorld({ invites: [existing] });
    const deleteApi = fakeAdminEndpoint('DELETE', `/invites/${existing.id}/`, {});
    await renderAdminApp('/settings/staff?tab=invited', { boot });

    const item = settingsScreen.users().getByTestId('user-invite');
    await item.hover();
    await item.getByRole('button', { name: 'Revoke' }).click();

    await expect.element(settingsScreen.successToast()).toHaveTextContent('Invitation revoked');
    await expect(settingsScreen.users().getByTestId('user-invite')).toHaveCount(0);
    expect(deleteApi.requests).toHaveLength(1);
  });

  it(
    'loads the next page of invitations and keeps the total count accurate',
    { timeout: 30_000 },
    async () => {
      const invites = Array.from({ length: 101 }, (_, index) =>
        invite({
          id: `invite${index}`,
          email: `invitee${index}@test.com`,
        }),
      );
      const { boot } = fakeStaffWorld();
      const invitesApi = fakeInvites(invites);
      await renderAdminApp('/settings/staff?tab=invited', { boot });

      const section = settingsScreen.users();
      await expect.element(section.getByText('invitee0@test.com', { exact: true })).toBeVisible();
      await expect(section.getByText('invitee100@test.com', { exact: true })).toHaveCount(0);
      await expect
        .element(section.getByRole('tab', { name: 'Invited' }))
        .toHaveTextContent('Invited101');
      await section.getByRole('button', { name: 'Load more (showing 100/101 invites)' }).click();

      await expect.element(section.getByText('invitee100@test.com', { exact: true })).toBeVisible();
      expect(invitesApi.requests.map((request) => request.page)).toEqual([1, 2]);
    },
  );

  it('applies staff limits to paid roles but still permits Contributors', async () => {
    const { boot } = fakeStaffWorld();
    const config = configResponse();
    config.config.hostSettings = {
      limits: { staff: { max: 1, error: 'Your plan does not support more staff' } },
    };
    await renderAdminApp('/settings/staff', {
      boot: { ...boot, browseConfig: { response: config } },
    });

    const modal = await openInviteModal();
    await modal.getByRole('radio', { name: /^Author\b/ }).click();
    await expect.element(modal).toHaveTextContent('Your plan does not support more staff');

    await modal.getByRole('radio', { name: /^Contributor\b/ }).click();
    await expect(modal.getByText('Your plan does not support more staff')).toHaveCount(0);
  });
  it('preserves a two-staff plan cap during trials while permitting Contributors', async () => {
    const owner = user('Owner');
    const editor = user('Editor');
    const { boot } = fakeStaffWorld({ currentUser: owner, users: [owner, editor] });
    const config = configResponse();
    config.config.hostSettings = {
      staffInvites: { maxStaff: 10, maxInvites: 15 },
      limits: { staff: { max: 2, error: 'Your plan does not support more staff' } },
    };
    await renderAdminApp('/settings/staff', {
      boot: { ...boot, browseConfig: { response: config } },
    });

    const modal = await openInviteModal();
    await modal.getByRole('radio', { name: /^Author\b/ }).click();
    await expect.element(modal).toHaveTextContent('Your plan does not support more staff');

    await modal.getByRole('radio', { name: /^Contributor\b/ }).click();
    await expect(modal.getByText('Your plan does not support more staff')).toHaveCount(0);
  });
  it('blocks Contributors at the trial staff cap and offers an upgrade', async () => {
    const owner = user('Owner');
    const contributors = Array.from({ length: 9 }, (_, i) =>
      user('Contributor', { id: `contributor-${i}`, email: `contributor-${i}@test.com` }),
    );
    const { boot } = fakeStaffWorld({ currentUser: owner, users: [owner, ...contributors] });
    const config = configResponse();
    config.config.hostSettings = {
      limits: { staff: { max: 2, error: 'Your plan does not support more staff' } },
      staffInvites: { maxStaff: 10, maxInvites: 15 },
      billing: { enabled: true, url: 'https://billing.example.com' },
    };
    await renderAdminApp('/settings/staff', {
      boot: { ...boot, browseConfig: { response: config } },
    });
    const modal = await openInviteModal();
    await expect.element(modal).toHaveTextContent('Your trial supports up to 10 staff');
    await modal.getByRole('link', { name: 'Upgrade to invite more people' }).click();
    await expect.poll(() => window.location.hash).toBe('#/pro');
  });

  it('uses a configured upgrade route without requiring a billing iframe URL', async () => {
    const { boot } = fakeStaffWorld();
    const config = configResponse();
    config.config.hostSettings = {
      staffInvites: { maxStaff: 10, maxInvites: 15 },
      billing: { enabled: true, upgradeUrl: '#/pro/custom-upgrade' },
    };
    fakeAdminEndpoint(
      'POST',
      '/invites/',
      {
        errors: [
          {
            type: 'HostLimitError',
            message: 'Host Limit error, cannot save invite.',
            context: 'Your trial allows 15 staff invitation emails in total, including resends.',
          },
        ],
      },
      { status: 403 },
    );
    await renderAdminApp('/settings/staff', {
      boot: { ...boot, browseConfig: { response: config } },
    });
    const modal = await openInviteModal();
    await modal.getByLabelText('Email address').fill('new@example.com');
    await modal.getByRole('button', { name: 'Send invitation' }).click();
    await expect.element(modal).toHaveTextContent('Your trial allows 15 staff invitation emails');
    await modal.getByRole('radio', { name: 'Editor', exact: true }).click();
    await expect.element(modal).toHaveTextContent('Your trial allows 15 staff invitation emails');
    await expect.element(modal.getByRole('button', { name: 'Send invitation' })).toBeDisabled();
    await modal.getByRole('link', { name: 'Upgrade to invite more people' }).click();
    await expect.poll(() => window.location.hash).toBe('#/pro/custom-upgrade');
  });
});
