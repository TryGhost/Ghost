import { describe, expect, it } from 'vitest';
import { shouldRunScreenTransition } from './screen-transition';

const editor = { screenTransition: true };
const automationEditor = { screenTransition: true };
const settings = { screenTransition: true, settingsSidebar: true };
const settingsSection = {};
const list = {};
const guard = {};

const posts = [guard, list];
const tags = [guard, {}];
const post = [guard, editor];
const automation = [guard, automationEditor];
const settingsRoot = [guard, settings];
const settingsChild = [guard, settings, settingsSection];

describe('shouldRunScreenTransition', () => {
  it.each([
    ['entering the editor', posts, post, true],
    ['leaving the editor', post, posts, true],
    ['entering Settings', posts, settingsChild, true],
    ['leaving Settings', settingsChild, posts, true],
    ['moving from Settings to the editor', settingsChild, post, true],
    ['moving between marked surfaces', post, automation, true],
    ['within the editor', post, post, false],
    ['within Settings', settingsRoot, settingsChild, false],
    ['between unmarked screens', posts, tags, false],
  ])('%s', (_name, from, to, expected) => {
    expect(shouldRunScreenTransition({ from, to })).toBe(expected);
  });

  it('leaves Settings opening inside the sidebar to the sidebar', () => {
    const input = { settingsSidebarEnabled: true, settingsInSidebar: true };
    expect(shouldRunScreenTransition({ ...input, from: posts, to: settingsRoot })).toBe(false);
    expect(shouldRunScreenTransition({ ...input, from: settingsChild, to: posts })).toBe(false);
    // Full-screen surfaces have no sidebar to animate the swap
    expect(shouldRunScreenTransition({ ...input, from: post, to: settingsRoot })).toBe(true);
    expect(shouldRunScreenTransition({ ...input, from: posts, to: post })).toBe(true);
  });
});
