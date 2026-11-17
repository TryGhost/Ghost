import type { Promisable } from 'type-fest';
import { describe, TestRunner } from 'vitest';

const previousNameBySuite = new WeakMap<WeakKey, string>();

const getCurrentSuite = () => {
  const collector = TestRunner.getCurrentSuite();
  return collector.suite ?? collector.file;
};

/**
 * An alias for `describe` that errors if it isn't called in alphabetical order within its suite.
 *
 * Uses JavaScript's default string ordering.
 */
export const alphabeticalDescribe = (name: string, body?: () => Promisable<void>) => {
  const suite = getCurrentSuite();

  const previousName = previousNameBySuite.get(suite);
  if (previousName !== undefined && name < previousName) {
    throw new Error(
      `${JSON.stringify(name)} must come before ${JSON.stringify(previousName)} within the same suite.`,
    );
  }
  previousNameBySuite.set(suite, name);

  return describe(name, body);
};
