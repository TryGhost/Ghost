import type { Plugin } from '@oxlint/plugins';

import { matchRegex } from './rules/match-regex.ts';

const plugin: Plugin = { rules: { 'match-regex': matchRegex } };

export default plugin;
