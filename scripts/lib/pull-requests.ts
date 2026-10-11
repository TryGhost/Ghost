import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface PullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  draft: boolean;
  url: string;
  /** The combined state of the head commit's checks */
  checks: 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED' | null;
}

interface Node {
  number: number;
  title: string;
  state: PullRequest['state'];
  isDraft: boolean;
  url: string;
  commits: { nodes: { commit: { statusCheckRollup: { state: PullRequest['checks'] } | null } }[] };
}

const FIELDS =
  'number title state isDraft url commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }';

/** The latest pull request from each of `branches`, in the GitHub repository of `cwd` */
export async function pullRequests(
  branches: string[],
  cwd: string,
): Promise<Map<string, PullRequest>> {
  if (branches.length === 0) {
    return new Map();
  }
  // One aliased lookup per branch keeps it to a single request
  const variables = branches.map((_, index) => `$b${index}: String!`).join(', ');
  const lookups = branches.map(
    (_, index) =>
      `b${index}: pullRequests(headRefName: $b${index}, first: 1, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ${FIELDS} } }`,
  );
  const query = `query($owner: String!, $repo: String!, ${variables}) { repository(owner: $owner, name: $repo) { ${lookups.join(' ')} } }`;
  const { stdout } = await promisify(execFile)(
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
      ...branches.flatMap((branch, index) => ['-f', `b${index}=${branch}`]),
    ],
    { cwd, timeout: 30_000 },
  );
  return parsePullRequests(branches, JSON.parse(stdout));
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
        checks: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
      });
    }
  });
  return found;
}
