import { describe, expect, it } from 'vitest';

import { StartContextSchema, ThemeSchema } from '../../src/bridge/index.ts';

const context = {
  site: {
    url: 'https://site.example/',
    title: 'Example',
    timezone: 'Europe/Amsterdam',
    locale: 'en',
  },
  user: { id: '1', role: 'Owner' },
  theme: { mode: 'dark', accent_color: '#FF1A75' },
  session: { revision: 3 },
  path: '/episodes/12',
};

describe('the start context', () => {
  it('accepts what Admin sends', () => {
    expect(StartContextSchema.parse(context)).toEqual(context);
  });

  it('drops fields a newer Admin adds, so an older SDK still starts', () => {
    const parsed = StartContextSchema.parse({
      ...context,
      user: { ...context.user, email: 'person@example.com' },
      somethingNew: true,
    });
    expect(parsed).toEqual(context);
  });

  it('refuses a context missing what the SDK relies on', () => {
    expect(StartContextSchema.safeParse({ ...context, session: undefined }).success).toBe(false);
    expect(StartContextSchema.safeParse({ ...context, session: { revision: -1 } }).success).toBe(
      false,
    );
    expect(StartContextSchema.safeParse({ ...context, session: { revision: 1.5 } }).success).toBe(
      false,
    );
    expect(StartContextSchema.safeParse({ ...context, path: 'episodes' }).success).toBe(false);
  });
});

describe('the theme', () => {
  it('is light or dark, never system', () => {
    expect(ThemeSchema.parse({ mode: 'light', accent_color: '#ff5500' })).toEqual({
      mode: 'light',
      accent_color: '#ff5500',
    });
    expect(ThemeSchema.safeParse({ mode: 'system', accent_color: '#ff5500' }).success).toBe(false);
  });
});
