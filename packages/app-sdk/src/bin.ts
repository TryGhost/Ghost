#!/usr/bin/env node
import { run } from './cli.ts';

const line = (text: string) => (text.endsWith('\n') ? text : `${text}\n`);

void run(process.argv.slice(2), {
  out: (text) => process.stdout.write(line(text)),
  err: (text) => process.stderr.write(line(text)),
}).then((code) => {
  process.exitCode = code;
});
