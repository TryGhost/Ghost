import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('loads the source export with the native Node loader', () => {
  const output = execFileSync(process.execPath, [
    '--conditions=source',
    '--input-type=module',
    '-e',
    `import LimitService, {LimitService as NamedLimitService} from '@tryghost/limit-service';
     if (LimitService !== NamedLimitService) process.exit(1);
     // Printed as a string: console.log colours an inspected boolean whenever the
     // environment forces colour, and this inherits the caller's environment.
     console.log(String(new LimitService().isLimited('staff')));`,
  ], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, NODE_OPTIONS: '' },
    encoding: 'utf8',
  });

  expect(output.trim()).toBe('false');
});
