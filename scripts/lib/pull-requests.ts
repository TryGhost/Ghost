import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface PullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  draft: boolean;
  url: string;
  head: string;
  base: string;
  /** Whether it can't merge into its base without resolving conflicts */
  conflicts: boolean;
  crossRepository: boolean;
  /** The combined state of the head commit's checks */
  checks: 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED' | null;
}

interface Node {
  number: number;
  title: string;
  state: PullRequest['state'];
  isDraft: boolean;
  url: string;
  headRefOid: string;
  baseRefName: string;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  isCrossRepository: boolean;
  commits: { nodes: { commit: { statusCheckRollup: { state: PullRequest['checks'] } | null } }[] };
}

const run = promisify(execFile);
const FIELDS =
  'number title state isDraft url headRefOid baseRefName mergeable isCrossRepository commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }';

/**
 * The latest pull request from each of `branches`, looked up by the name of the branch it
 * tracks, in the GitHub repository of `cwd`
 */
export async function pullRequests(
  branches: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<Map<string, PullRequest>> {
  if (branches.length === 0) {
    return new Map();
  }
  const refs = await run(
    'git',
    ['for-each-ref', '--format=%(refname:lstrip=2)%09%(upstream:lstrip=3)', 'refs/heads'],
    { cwd, signal },
  );
  const upstreams = new Map(
    refs.stdout.split('\n').map((line) => line.split('\t') as [string, string | undefined]),
  );
  const names = branches.map((branch) => upstreams.get(branch) || branch);

  // One aliased lookup per branch keeps it to a single request
  const variables = names.map((_, index) => `$b${index}: String!`).join(', ');
  const lookups = names.map(
    (_, index) =>
      `b${index}: pullRequests(headRefName: $b${index}, first: 1, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ${FIELDS} } }`,
  );
  const query = `query($owner: String!, $repo: String!, ${variables}) { repository(owner: $owner, name: $repo) { ${lookups.join(' ')} } }`;
  const { stdout } = await run(
    'gh',
    [
      'api',
      'graphql',
      '-f',
      `query=${query}`,
      '-F',
      'owner={owner}',
      '-F',
      'repo={repo}',
      ...names.flatMap((name, index) => ['-f', `b${index}=${name}`]),
    ],
    { cwd, signal, timeout: 30_000 },
  );
  const found = parsePullRequests(branches, JSON.parse(stdout));

  // Another fork's branch, or an old one, can have the same name
  const git = (args: string[]) =>
    run('git', args, { cwd, signal }).then(
      () => true,
      () => false,
    );
  const ours = async (branch: string, pr: PullRequest) => {
    if (!(await git(['cat-file', '-e', `${pr.head}^{commit}`]))) {
      return !pr.crossRepository;
    }
    const ref = `refs/heads/${branch}`;
    return (
      (await git(['merge-base', '--is-ancestor', pr.head, ref])) ||
      git(['merge-base', '--is-ancestor', ref, pr.head])
    );
  };
  const checked = await Promise.all(
    [...found].map(async ([branch, pr]) =>
      (await ours(branch, pr)) ? [[branch, pr] as const] : [],
    ),
  );
  return new Map(checked.flat());
}

export function parsePullRequests(
  branches: string[],
  response: { data: { repository: Record<string, { nodes: Node[] }> } },
): Map<string, PullRequest> {
  const found = new Map<string, PullRequest>();
  branches.forEach((branch, index) => {
    const node = response.data.repository[`b${index}`]?.nodes[0];
    if (node) {
      found.set(branch, {
        number: node.number,
        title: node.title,
        state: node.state,
        draft: node.isDraft,
        url: node.url,
        head: node.headRefOid,
        base: node.baseRefName,
        conflicts: node.mergeable === 'CONFLICTING',
        crossRepository: node.isCrossRepository,
        checks: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
      });
    }
  });
  return found;
}
