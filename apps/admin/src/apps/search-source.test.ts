import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { describe, expect, it } from 'vitest';
import { appsSearchItems } from './search-source';

const user = (role: string) => ({ roles: [{ name: role }] }) as unknown as User;
const admin = user('Administrator');

// only the fields the search reads
const installation = (id: string, name: string, status: AppInstallation['status'] = 'active') =>
  ({
    id,
    status,
    manifest_url: `https://${id}.example.com/ghost-app.json`,
    manifest: { name },
  }) as AppInstallation;

const podcast = installation('installation-1', 'Podcast');
const newsletter = installation('installation-2', 'Newsletter tools', 'suspended');

describe('appsSearchItems', () => {
  it('opens each installed app, in the list’s order', () => {
    expect(appsSearchItems(admin, true, [podcast, newsletter])).toMatchObject([
      { kind: 'navigate', id: 'installation-1', title: 'Podcast', to: '/apps/installation-1' },
      { kind: 'navigate', id: 'installation-2', title: 'Newsletter tools' },
    ]);
  });

  it('opens a suspended app’s review rather than its page', () => {
    expect(appsSearchItems(admin, true, [newsletter])[0]).toMatchObject({
      to: `/apps/install?manifest=${encodeURIComponent(newsletter.manifest_url)}`,
    });
  });

  it.each(['Owner', 'Administrator'])('lists apps for an %s', (role) => {
    expect(appsSearchItems(user(role), true, [podcast])).toHaveLength(1);
  });

  it.each(['Editor', 'Author', 'Contributor', 'Super Editor'])(
    'lists nothing for an %s',
    (role) => {
      expect(appsSearchItems(user(role), true, [podcast])).toEqual([]);
    },
  );

  it('lists nothing without the apps flag, or before the user loads', () => {
    expect(appsSearchItems(admin, false, [podcast])).toEqual([]);
    expect(appsSearchItems(undefined, true, [podcast])).toEqual([]);
  });
});
