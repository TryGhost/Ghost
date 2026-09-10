import { expect, it } from 'vitest';
import type { Admin7FeatureDefinition } from './features';
import { resolveAdmin7 } from './resolve-admin7';

// Test-only milestones exercise dependencies without registering speculative flags.
type Feature = 'foundation' | 'dependent';
const definitions: Record<Feature, Admin7FeatureDefinition<Feature>> = {
  foundation: {
    flag: 'foundationFlag',
    title: 'Foundation',
    description: '',
    surfaces: ['react'],
    excludedRoutes: [/^\/editor(?:\/|$)/],
    requires: [],
  },
  dependent: {
    flag: 'dependentFlag',
    title: 'Dependent',
    description: '',
    surfaces: ['react'],
    excludedRoutes: [],
    requires: ['foundation'],
  },
};
const route = { pathname: '/members', surface: 'react' } as const;

it('requires both milestone flags and never enables a prerequisite implicitly', () => {
  expect(resolveAdmin7(definitions, { dependentFlag: true }, route)).toEqual({
    foundation: false,
    dependent: false,
  });
  expect(resolveAdmin7(definitions, { foundationFlag: true, dependentFlag: false }, route)).toEqual(
    { foundation: true, dependent: false },
  );
  expect(resolveAdmin7(definitions, { foundationFlag: true, dependentFlag: true }, route)).toEqual({
    foundation: true,
    dependent: true,
  });
});

it('disables dependents when their prerequisite is excluded on the current route', () => {
  expect(
    resolveAdmin7(
      definitions,
      { foundationFlag: true, dependentFlag: true },
      { pathname: '/editor/post/new', surface: 'react' },
    ),
  ).toEqual({ foundation: false, dependent: false });
});

it('fails closed for circular prerequisites', () => {
  const circular = {
    ...definitions,
    foundation: { ...definitions.foundation, requires: ['dependent'] satisfies Feature[] },
  };
  expect(resolveAdmin7(circular, { foundationFlag: true, dependentFlag: true }, route)).toEqual({
    foundation: false,
    dependent: false,
  });
});
