import { LucideIcon } from '@tryghost/shade/utils';

export type AppIcon = typeof LucideIcon.Podcast;

export interface AppDefinition {
  id: string;
  name: string;
  /** Short description shown on the app card and detail page. */
  description: string;
  icon: AppIcon;
  /** Brand colour behind the icon, shared with the app's editor card. */
  color: string;
  /** Where Manage and activation land. Defaults to the app's page under Apps. */
  homePath?: string;
  /** What the app adds to the site; shown in the activation flow. */
  highlights: { title: string; description: string }[];
}

// The catalogue of apps that can be activated. Stubbed as a static list until
// apps are backed by the API.
export const APPS: AppDefinition[] = [
  {
    id: 'podcasts',
    name: 'Podcasts',
    description:
      'Publish podcast episodes alongside your posts and let members listen right from your site.',
    icon: LucideIcon.Podcast,
    color: '#FA5D00',
    highlights: [
      {
        title: 'Podcast card in the editor',
        description: 'Add an episode to any post with a dedicated podcast card.',
      },
      {
        title: 'Episodes on your site',
        description: 'Episodes render with a player in your theme and a link in email.',
      },
      {
        title: 'Manage from one place',
        description: 'Adjust podcast settings from the Apps section whenever you need.',
      },
    ],
  },
  {
    id: 'editorial-board',
    name: 'Editorial board',
    description:
      'Manage your publication’s schedule. Keep ideas, drafts, and scheduled work synchronized in one place.',
    icon: LucideIcon.KanbanSquare,
    color: '#6B3FA0',
    homePath: '/editorial-board',
    highlights: [
      {
        title: 'One board, fed by your site',
        description: 'Posts appear on the board with their titles and feature images attached.',
      },
      {
        title: 'Track your ideas, too',
        description:
          'Record ideas that aren’t posts yet, then convert them to drafts with one click.',
      },
      {
        title: 'Assignments and target dates',
        description:
          'Hand work to someone, set a target date, and see it update when you schedule or publish.',
      },
      {
        title: 'Board, month, or list',
        description: 'The same work, three ways to look at it, right from the main navigation.',
      },
    ],
  },
];

export function getApp(id: string | undefined): AppDefinition | undefined {
  return APPS.find((app) => app.id === id);
}

export function getAppHomePath(app: AppDefinition): string {
  return app.homePath ?? `/apps/${app.id}`;
}
