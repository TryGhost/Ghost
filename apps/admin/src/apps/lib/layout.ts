import type { Layout, SafeArea } from '@tryghost/app-contracts/bridge';

export const sameSafeArea = (a: SafeArea, b: SafeArea) =>
  a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

export const sameLayout = (a: Layout | undefined, b: Layout) =>
  a !== undefined && sameSafeArea(a.safeArea, b.safeArea);
