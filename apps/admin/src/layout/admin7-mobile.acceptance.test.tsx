import { expect, it } from 'vitest';
import { fakeAdminStats, fakeMembers, renderAdminApp } from '@test-utils/acceptance';

it.each([
  { admin7Mobile: false, admin7Design: false },
  { admin7Mobile: true, admin7Design: false },
  { admin7Mobile: false, admin7Design: true },
  { admin7Mobile: true, admin7Design: true },
])('passes independent mobile/design flags to Shade: %j', async (labs) => {
  fakeMembers([]);
  if (labs.admin7Design) {
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
  }
  await renderAdminApp('/members', { labs });

  await expect
    .poll(() =>
      document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7-mobile'),
    )
    .toBe(String(labs.admin7Mobile));
});

it('keeps mobile hardening off when the backend does not supply the flag', async () => {
  fakeMembers([]);
  await renderAdminApp('/members', { labs: { admin7Design: false } });

  await expect
    .poll(() =>
      document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7-mobile'),
    )
    .toBe('false');
});

it('enables the preview from a tab override while the site flag is off', async () => {
  fakeMembers([]);
  await renderAdminApp('/members?labs=admin7Mobile', {
    labs: { admin7Mobile: false, admin7Design: false },
  });

  await expect
    .poll(() =>
      document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7-mobile'),
    )
    .toBe('true');
});
