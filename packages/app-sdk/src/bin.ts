#!/usr/bin/env node
import { run } from './cli.ts';

const line = (text: string) => (text.endsWith('\n') ? text : `${text}\n`);

run(process.argv.slice(2), {
  out: (text) => process.stdout.write(line(text)),
  err: (text) => process.stderr.write(line(text)),
}).then(
  (code) => {
    process.exitCode = code;
  },
  // run reports its own failures, so this is a bug: say what, without a stack trace.
  (error: unknown) => {
    process.stderr.write(line(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  },
);
