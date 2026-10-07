import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { servedFrom } from './served-from';

/** One kind of access an app gets, as a consent screen lists it. */
export interface AccessItem {
  title: string;
  description: string;
}

/**
 * What an app can do with the account of whoever installs it. Apps act with the staff
 * user's own session until Permissions and auth gives them scopes, and only the Owner and
 * Administrators can install them, so this is everything an Administrator can do, minus
 * what the bridge blocks (D68: staff tokens, integrations and keys, invites, webhooks,
 * exports, and installing or approving apps). Keep it in step with both.
 */
const ACCOUNT_ACCESS: AccessItem[] = [
  {
    title: 'Posts and pages',
    description:
      'View, create, edit, publish and delete all posts and pages, including drafts and scheduled ones',
  },
  { title: 'Tags', description: 'View, create, edit and delete tags' },
  {
    title: 'Members',
    description:
      'View, create, edit and delete members, including their email addresses, labels and subscriptions',
  },
  {
    title: 'Tiers and offers',
    description: 'View, create and edit tiers, prices, discounts and free trials',
  },
  {
    title: 'Newsletters',
    description: 'View, create and edit newsletters, and send posts to your members by email',
  },
  { title: 'Comments', description: 'View, moderate and delete comments' },
  {
    title: 'Analytics',
    description: 'View your site’s traffic, member growth and email performance',
  },
  {
    title: 'Site settings',
    description: 'View and edit your site’s settings, like its title, navigation and design',
  },
  { title: 'Staff', description: 'View staff users and change their roles' },
];

/**
 * Everything an app gets: what the publisher's account can do, and sending what it reads
 * to the app's own service, where its page runs.
 */
export function appAccess(manifest: AppManifest): AccessItem[] {
  return [
    ...ACCOUNT_ACCESS,
    {
      title: 'Connected service',
      description: `Read and write data to ${servedFrom(manifest)}`,
    },
  ];
}
