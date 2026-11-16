import path from 'node:path';
import { readDependencyBoundaries } from '../lib/dependency-boundaries.ts';
import {
  checkDomainShape,
  countTransitionFiles,
  crossDomainRelations,
} from '../lib/domain-shape.ts';

// Checks the shape and file names of every domain. With --report it also prints
// the counts that are tracked rather than enforced: files still in transition/,
// what reshaped wiring still imports from legacy code, and data relations that
// cross a domain boundary. The report never fails.

const repository = path.resolve(import.meta.dirname, '../../..');
const domainsRoot = path.join(repository, 'ghost/domains');

const problems = checkDomainShape(domainsRoot);
for (const { rule, file, message } of problems) {
  console.error(`error ${rule}: ghost/domains/${file}: ${message}`);
}
if (problems.length) {
  process.exitCode = 1;
} else {
  console.log('Domain shape and file names are as the rules describe.');
}

if (process.argv.includes('--report')) {
  console.log('\nFiles still under transition/ (counted, not enforced):');
  const counts = countTransitionFiles(domainsRoot);
  for (const { domain, files, byFolder } of counts) {
    const folders = Object.entries(byFolder)
      .map(([folder, count]) => `${folder} ${count}`)
      .join(', ');
    console.log(`  ${domain}: ${files}${folders ? ` (${folders})` : ''}`);
  }
  console.log(`  total: ${counts.reduce((total, { files }) => total + files, 0)}`);

  const { counted } = readDependencyBoundaries(repository);
  for (const [rule, title] of [
    [
      'domain-legacy-imports',
      'Imports of legacy code in ghost/core from service roots and domain files',
    ],
    [
      'domain-transition-imports',
      'Imports of a transition/ folder from service roots and domain files',
    ],
  ] as const) {
    const edges = counted.filter((item) => item.rule.name === rule);
    console.log(`\n${title}: ${edges.length}`);
    for (const { from, to } of edges) {
      console.log(`  ${from} → ${to}`);
    }
  }

  const relations = crossDomainRelations(repository, domainsRoot);
  console.log(
    `\nData relations that may cross a domain boundary (read from source, to review): ${relations.length}`,
  );
  for (const { kind, file, from, to, detail } of relations) {
    console.log(`  ${kind}: ${file}: ${detail} (${from} → ${to})`);
  }
}
