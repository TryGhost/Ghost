import type { Admin7Features } from '@tryghost/shade/app';

export type Admin7Route = {
  pathname: string;
  surface: 'react' | 'ember';
};

export type Admin7FeatureDefinition<Feature extends string> = {
  flag: string;
  title: string;
  description: string;
  surfaces: readonly Admin7Route['surface'][];
  excludedRoutes: readonly RegExp[];
  requires: readonly Feature[];
};

export const admin7Features: Record<
  keyof Admin7Features,
  Admin7FeatureDefinition<keyof Admin7Features>
> = {
  pill: {
    flag: 'admin7Pill',
    title: 'Admin 7 · Milestone 2 · Pill controls',
    description:
      'Preview Admin 7 controls and page headers on React pages. The editor is excluded.',
    surfaces: ['react'],
    excludedRoutes: [/^\/editor(?:\/|$)/],
    requires: [],
  },
};
