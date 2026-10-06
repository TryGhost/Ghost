/** Resolve current callable aliases through an existing WebMCP capability.
 * Review definitions before first use. This pins origin/page URL, not document
 * lifetime: reacquire application context after an editor reload. */
export function createLiveWebMcpCaller(webmcp, { origin, pageUrl } = {}) {
  if (!origin || !pageUrl) {
    throw new Error('Pin the expected origin and pageUrl');
  }
  if (new URL(pageUrl).origin !== origin) {
    throw new Error('pageUrl must belong to the pinned origin');
  }
  const approvedDescriptors = new Map();
  let inFlight = false;

  return async function call(baseName, input, options) {
    if (inFlight) {
      throw new Error('WebMCP calls must be sequential');
    }
    if (typeof baseName !== 'string' || !baseName || baseName.includes('__')) {
      throw new Error('Use a stable base tool name, without a UUID alias');
    }
    inFlight = true;
    try {
      const snapshot = await webmcp.fetchTools();
      const description = snapshot.description();
      const start = description.indexOf('[');
      const end = description.lastIndexOf(']');
      if (start < 0 || end < start) {
        throw new Error('No tool descriptors available');
      }
      const tools = JSON.parse(description.slice(start, end + 1));
      if (!Array.isArray(tools)) {
        throw new Error('Expected an array of tool descriptors');
      }
      const matches = tools.filter(
        (tool) =>
          typeof tool?.name === 'string' &&
          tool.name.startsWith(baseName + '__') &&
          tool.origin === origin &&
          tool.pageUrl === pageUrl,
      );
      if (matches.length !== 1) {
        throw new Error(`Expected one ${baseName}, got ${matches.length}`);
      }
      const tool = matches[0];
      const descriptor = JSON.stringify({ ...tool, name: baseName });
      const previous = approvedDescriptors.get(baseName);
      if (previous !== undefined && previous !== descriptor) {
        throw new Error(`Definition changed for ${baseName}; inspect before continuing`);
      }
      approvedDescriptors.set(baseName, descriptor);
      // Deliberately no retry, including stale dispatch and post-acceptance timeout.
      return await snapshot.call(tool.name, input, options);
    } finally {
      inFlight = false;
    }
  };
}
