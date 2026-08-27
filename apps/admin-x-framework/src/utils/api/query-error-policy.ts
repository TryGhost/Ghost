import type { QueryCache, QueryFunctionContext } from '@tanstack/react-query';

type RequestPolicy = {
  defaultErrorHandler: boolean;
};

const requestPolicies = new WeakMap<QueryCache, WeakMap<object, RequestPolicy>>();

/** Capture policy when TanStack invokes the queryFn, before another observer can change Query.meta. */
export async function withQueryErrorPolicy<ResponseData>(
  context: QueryFunctionContext,
  defaultErrorHandler: boolean,
  request: () => Promise<ResponseData>,
): Promise<ResponseData> {
  const cache = context.client.getQueryCache();
  const query = cache.find({ queryKey: context.queryKey, exact: true });

  if (query) {
    let policies = requestPolicies.get(cache);
    if (!policies) {
      policies = new WeakMap();
      requestPolicies.set(cache, policies);
    }
    const policy = { defaultErrorHandler };
    policies.set(query, policy);

    try {
      const response = await request();
      if (policies.get(query) === policy) {
        policies.delete(query);
      }
      return response;
    } catch (error) {
      // QueryCache.onError consumes final failures in the promise chain before
      // this task runs. The fallback also clears cancellations and retry attempts
      // that do not produce a cache error, without deleting a newer snapshot.
      setTimeout(() => {
        if (policies.get(query) === policy) {
          policies.delete(query);
        }
      }, 0);
      throw error;
    }
  }

  return request();
}

export function takeQueryErrorPolicy(cache: QueryCache, query: object): boolean | undefined {
  const policies = requestPolicies.get(cache);
  const policy = policies?.get(query);
  policies?.delete(query);
  return policy?.defaultErrorHandler;
}

/** Clear a snapshot before TanStack starts a new request for the same Query. */
export function clearQueryErrorPolicy(cache: QueryCache, query: object) {
  requestPolicies.get(cache)?.delete(query);
}
