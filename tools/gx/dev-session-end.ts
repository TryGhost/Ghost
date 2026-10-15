import { readFileSync } from 'node:fs';
import { endCodexSession } from './lib/dev-lifecycle.ts';
import { checkoutRoot } from '../scripts/lib/ghost-dev-env.ts';

// SessionEnd has a short deadline: signal the watcher instead of waiting for dev:down.
endCodexSession(checkoutRoot, JSON.parse(readFileSync(0, 'utf8')));
