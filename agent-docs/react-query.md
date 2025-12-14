# React Query Reference Guide

*Condensed from TkDodo's Practical React Query series (all 31 posts) for code review and implementation guidance.*

---

## Table of Contents

- [Core Concepts & Mental Models](#core-concepts--mental-models)
- [Query Keys](#query-keys)
- [Query Options API (Composability)](#query-options-api-composability)
- [Query Function Context](#query-function-context)
- [Data Transformations](#data-transformations)
- [Mutations & Invalidation](#mutations--invalidation)
- [Error Handling](#error-handling)
- [Performance & Optimization](#performance--optimization)
- [Status Checks](#status-checks)
- [Forms Integration](#forms-integration)
- [TypeScript Integration](#typescript-integration)
- [Testing](#testing)
- [React Context Integration](#react-context-integration)
- [Advanced Patterns](#advanced-patterns)
  - [Infinite Queries](#infinite-queries)
  - [Placeholder vs Initial Data](#placeholder-vs-initial-data)
  - [Seeding the Query Cache](#seeding-the-query-cache)
  - [WebSockets Integration](#websockets-integration)
  - [Offline Support](#offline-support)
  - [React Router Integration](#react-router-integration)
  - [Concurrent Optimistic Updates](#concurrent-optimistic-updates)
- [Understanding React Query Internals](#understanding-react-query-internals)
- [Limitations & Gotchas](#limitations--gotchas)
- [When You Might Not Need React Query](#when-you-might-not-need-react-query)
- [FAQs & Common Issues](#faqs--common-issues)
- [Essential Patterns](#essential-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Core Concepts & Mental Models

### React Query Is NOT a Data Fetching Library

React Query **manages asynchronous state**—it doesn't fetch data. Your `queryFn` (using fetch, axios, GraphQL clients, etc.) handles fetching. React Query only requires that functions return resolved or rejected Promises.

**Why it matters:** React Query solves the genuinely complex problem of managing async state predictably across your application. A simple `fetch` in `useEffect` contains hidden bugs: race conditions, missing loading states, ambiguous empty states, state pollution, and StrictMode inefficiency. React Query provides battle-tested patterns developers rarely implement correctly from scratch.

**Code Review:** Flag questions about "configuring React Query for baseURL" or "accessing response headers with React Query"—these belong in HTTP clients, not React Query.

### Server State vs Client State

The fundamental distinction:
- **Client State:** Synchronously available data you fully own (UI toggles, form inputs, filters)
- **Server State:** Remotely persisted, asynchronously available snapshots that can become stale

Server state characteristics:
- You don't exclusively own it
- Can become outdated
- Requires specialized lifecycle management (loading, errors, staleness)

**Important:** React Query is specifically for **async server state**. Don't use it for synchronous client state (UI toggles, forms, preferences)—this requires disabling core features and creates verbose, inefficient code. Use zustand, xstate/store, or React Context for client state instead.

**Anti-Pattern:** Copying query data into local state or Redux destroys your single source of truth.

### Queries Are Declarative

Treat query keys like `useEffect` dependencies. When a query key changes, React Query automatically refetches. This keeps filter state synchronized with data fetching without manual effect orchestration.

**Rule:** If you use a variable inside your `queryFn`, it must appear in the `queryKey`.

```typescript
// ✅ Correct
const { data } = useQuery({
  queryKey: ['issues', filters],
  queryFn: () => fetchIssues(filters),
})

// ❌ Anti-pattern: filters not in key
const { data } = useQuery({
  queryKey: ['issues'],
  queryFn: () => fetchIssues(filters),
})
```

Use `eslint-plugin-react-query` to enforce this automatically.

### React Query as a State Manager

Call `useQuery` wherever you need data—it's a true state manager like Redux or Zustand. The QueryKey serves as a unique identifier enabling data sharing across components. Don't sync data out of React Query's cache into local state via `useEffect`.

**Misconception:** Passing data via props or Context to avoid "extra fetches" defeats the system's benefits. Component-level data fetching with `useQuery` isn't a separation-of-concerns violation—it's dependency injection via hooks.

### Stale While Revalidate (Cache Semantics)

React Query implements HTTP cache semantics: **As long as data is fresh, it will always come from the cache only.** You won't see network requests for fresh data.

**`staleTime` is your primary tuning lever.** The default of zero marks data stale immediately, prioritizing freshness over minimizing network requests. You must define `staleTime` based on your domain:

- **High-stability data** (rarely changing config): `staleTime: Infinity`
- **Collaborative tools** (multiple users updating): `staleTime: 0`
- **Most APIs:** Set a sensible global default (20 seconds minimum handles most deduplication), then override per-query

**Code Review:** Watch for components that disable all revalidation triggers—they're usually fighting the design rather than configuring `staleTime` appropriately.

### Smart Refetch Triggers

React Query strategically initiates background updates at high-probability moments:
- **`refetchOnMount`**: New component instances (data might be stale)
- **`refetchOnWindowFocus`**: Tab regain (excellent for detecting user returns)
- **`refetchOnReconnect`**: Network restoration

**The library's defaults prioritize freshness over request minimization.** Customize `staleTime` rather than disabling smart refetches—this preserves the async state synchronization that makes React Query valuable.

### Key Distinctions

| Concept | Purpose |
|---------|---------|
| `staleTime` | Duration before data transitions from fresh to stale; controls when background refetches occur |
| `gcTime` | Duration before inactive queries are removed from cache (default: 5 minutes) |
| `status` | Reflects data availability (success/loading/error) |
| `fetchStatus` | Indicates query execution (fetching/paused/idle) |

Adjust `staleTime` far more often than `gcTime`.

---

## Query Keys

### Query Keys Drive Behavior

Keys serve three critical functions:
1. Caching data uniquely
2. Triggering automatic refetches when dependencies change
3. Enabling manual cache interactions

**Golden rule:** When state affecting your query changes, update the Query Key itself rather than calling imperative `refetch()` methods.

### Structural Best Practices

**Always use arrays.** Standardize on array syntax for consistency:

```typescript
['todos', 'list', { filters: 'done' }]
['todos', 'detail', 1]
```

**Graduate from generic to specific.** Structure keys hierarchically to enable fuzzy matching for cache invalidation at any level of specificity.

**Never use the same key for `useQuery` and `useInfiniteQuery`** since they share one cache with fundamentally different data structures.

### Query Key Factories (Essential Pattern)

Avoid repeating key declarations manually:

```typescript
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: Filters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}
```

**Organization:** Colocate keys with queries in feature directories rather than centralizing globally.

### Object Keys vs Array Keys

Object-based query keys offer **named destructuring**, eliminating fragile array indexing. They also enable more flexible fuzzy matching for invalidation across overlapping scopes:

```typescript
const todoKeys = {
  list: (state: State, sorting: Sorting) =>
    [{ scope: 'todos', state, sorting }] as const,
}
```

### Anti-Patterns

- Calling `refetch()` when you expect parameter changes (parameters stay identical)
- Using identical keys for infinite and standard queries
- Manually constructing keys throughout components instead of using factories
- Storing all Query Keys in a single global utilities file

---

## Query Options API (Composability)

**The composability feature you requested!**

### Core Principles

**Composability Over Multiple Arguments:** React Query v5 unified its API around a single object parameter. This enables a powerful pattern: passing the same configuration object to different functions (`useQuery`, `prefetchQuery`, `useSuspenseQuery`, `getQueryData`).

### The queryOptions Helper

This runtime-transparent function provides TypeScript-level benefits without performance overhead:

```typescript
import { queryOptions } from '@tanstack/react-query'

const todoQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000
})

// Reusable across all query functions:
useQuery(todoQuery)
prefetchQuery(todoQuery)
useSuspenseQuery(todoQuery)
queryClient.getQueryData(todoQuery.queryKey) // Type-safe!
```

**Benefits:**
- **Catches typos** in property names (unlike bare objects where TypeScript is lenient)
- **Tags query keys** with return type information from the query function
- **Enables type-safe inference** in `getQueryData`, `setQueryData`, and related methods
- **No runtime overhead** - it's just a pass-through for type safety

### Pattern: Queries as First-Class Objects

Define queries as constants rather than inline them:

```typescript
const postQueries = {
  all: () => ['posts'] as const,

  lists: () => [...postQueries.all(), 'list'] as const,
  list: (filters: Filters) => queryOptions({
    queryKey: [...postQueries.lists(), filters],
    queryFn: () => fetchPosts(filters),
    staleTime: 10_000
  }),

  details: () => [...postQueries.all(), 'detail'] as const,
  detail: (id: number) => queryOptions({
    queryKey: [...postQueries.details(), id],
    queryFn: () => fetchPost(id),
    staleTime: 60_000
  })
}

// Usage in components:
const { data } = useQuery(postQueries.detail(1))

// Usage in loaders:
await queryClient.prefetchQuery(postQueries.list(filters))

// Type-safe cache access:
const cached = queryClient.getQueryData(postQueries.detail(1).queryKey)
// cached is properly typed as Post | undefined
```

### Code Review Guidance

**Favor Query Definition Objects:**
- Encourage developers to define queries with `queryOptions` for reusability
- Co-locate keys, functions, and configuration together
- Preserves hierarchy while embedding full query definitions

**Deprecate Simple Custom Hook Wrappers:**
If a custom hook merely wraps `useQuery` without additional logic, suggest inlining the query call instead:

```typescript
// ❌ Unnecessary wrapper
export const useTodos = () => {
  return useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
}

// ✅ Better: query definition object
export const todosQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos
})

// Use directly: useQuery(todosQuery)
```

**When Custom Hooks Still Make Sense:**
- Composing multiple queries together
- Adding component-specific state/logic
- Combining client state with server state
- Wrapping with additional error handling or transformations

---

## Query Function Context

### Core Concept

The `QueryFunctionContext` is an object React Query passes to your `queryFn`, enabling you to access query metadata without relying on closure variables. This prevents a common pitfall: **query keys diverging from actual dependencies**.

### Avoid Inline Function Closures

Inline functions that close over external variables can easily fall out of sync with your query key. When adding new parameters, you might update the `queryFn` but forget to update the `queryKey`.

### Leverage the queryKey Parameter

The context object contains your `queryKey`, allowing you to extract all necessary parameters directly:

```typescript
const fetchTodos = async ({ queryKey }) => {
  const [, state, sorting] = queryKey
  // Use extracted parameters
}
```

### Type-Safe Pattern with Query Key Factories

Combine factories with object-based keys for maximum safety and clarity:

```typescript
const todoKeys = {
  list: (state: State, sorting: Sorting) =>
    [{ scope: 'todos', state, sorting }] as const,
}

const fetchTodos = async ({
  queryKey: [{ state, sorting }]
}: QueryFunctionContext<ReturnType<typeof todoKeys['list']>>) => {
  // Named destructuring prevents index errors
  return api.getTodos({ state, sorting })
}
```

### Cancellation with signal

The context also provides an `AbortSignal` for request cancellation:

```typescript
const fetchTodos = async ({ signal }) => {
  const response = await fetch('/api/todos', { signal })
  return response.json()
}
```

React Query automatically aborts ongoing requests when:
- The query is cancelled (component unmounts, manual cancellation)
- A new fetch is triggered while the previous one is still running

### Code Review Guidance

- Check that `queryKey` contents match all parameters used in `queryFn`
- Prefer object keys with named properties over positional array access
- Ensure type annotations on `QueryFunctionContext` reference the factory's return type
- Verify that factory functions use `as const` assertions for strict typing
- Confirm `signal` is passed to fetch calls for proper cancellation

---

## Data Transformations

### Core Principle

Data transformation location depends on context: "It depends" — the choice involves tradeoffs between performance, maintainability, and code organization.

### Four Transformation Approaches

#### 0. Backend Transformation (Ideal)
Return data in the exact shape needed. Eliminates frontend work but isn't always feasible with third-party APIs.

#### 1. Within queryFn
Transform inside the fetch function before caching:

```typescript
queryFn: async () => {
  const response = await fetch('/api/todos')
  const data = await response.json()
  return data.map(todo => ({ ...todo, upperTitle: todo.title.toUpperCase() }))
}
```

**Trade-offs:**
- ✅ Tight co-location with fetching logic
- ❌ Runs on every request (even from cache on remount)
- ❌ Obscures original data structure in DevTools
- ❌ All components receive transformed shape

#### 2. In Custom Hooks (Render Layer)
Transform via `useMemo` in a custom hook wrapper:

```typescript
const useTodos = () => {
  const { data, ...queryInfo } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos
  })

  const transformed = useMemo(() =>
    data?.map(todo => ({ ...todo, upperTitle: todo.title.toUpperCase() })),
    [data]
  )

  return { data: transformed, ...queryInfo }
}
```

**Trade-offs:**
- ✅ Flexible composition with other hook logic
- ✅ DevTools shows original data structure
- ❌ Requires careful memoization and null-safety handling
- ⚠️ **Critical:** Use `queryInfo.data` as dependency, not `queryInfo` (defeats optimization)

#### 3. Using the `select` Option (Most Performant)
React Query's built-in selector feature enables transformation while supporting **partial subscriptions**:

```typescript
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.map(todo => ({
    ...todo,
    upperTitle: todo.title.toUpperCase()
  }))
})
```

**Advantages:**
- ✅ Components only rerender if their selected slice changes
- ✅ Most performant option for complex data
- ✅ Structural sharing happens twice (queryFn result + select result)

**Example - Partial Subscription:**
```typescript
// Component only rerenders when count changes, not when items change
const { data: count } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.length
})
```

**Trade-offs:**
- ⚠️ Structure varies per observer
- ⚠️ Use stable function references (avoid inline functions for optimal performance)

### Code Review Guidance

**Avoid** spreading `...queryInfo` in modern React Query (v4+) due to tracked queries invoking all property getters.

**Prefer** stable function references for `select` over inline functions:
```typescript
// ✅ Better
const selectTodoCount = (data) => data.length
useQuery({ queryKey: ['todos'], queryFn: fetchTodos, select: selectTodoCount })

// ❌ Creates new function every render
useQuery({ queryKey: ['todos'], queryFn: fetchTodos, select: (data) => data.length })
```

**Use** optional chaining when transforming in render/custom hooks since data can be undefined.

**Consider** the DevTools experience — queryFn transformations hide original API shape, potentially complicating debugging.

---

## Mutations & Invalidation

### Core Principles

**Imperative vs. Declarative:** Mutations are imperative (invoked manually), while queries are declarative (run automatically). Never expect mutations to execute on component mount.

**Single Argument Limitation:** Pass multiple mutation variables as an object:

```typescript
// ❌ Invalid
mutation.mutate('title', 'body')

// ✅ Valid
mutation.mutate({ title, body })
```

### Synchronization Strategies

#### Invalidation (Preferred)

Mark cached queries as stale and refetch when needed. Fuzzy matching means partial query key matches invalidate multiple cache entries.

**Critical insight:** "Invalidation merely refetches all active Queries that it matches, and marks the rest as `stale`." Inactive queries won't trigger network requests immediately; they'll refetch only when needed.

Use when:
- Mutation doesn't return complete data
- Multiple queries could be affected

#### Direct Updates (Use Carefully)

Update cache via `setQueryData` only when mutation response contains all necessary data. Avoid for sorted lists or complex data structures—invalidation is safer.

### Automatic Invalidation Patterns

**Global Cache Callbacks (Simplest):**

```typescript
new MutationCache({
  onSuccess: () => queryClient.invalidateQueries()
})
```

This blanket approach prioritizes simplicity over granularity, mirroring frameworks like React Router.

**Smart Refinements:**
1. **MutationKey-based filtering:** Tie mutation keys to query keys to invalidate related data only
2. **Predicate functions:** Exclude "static" queries (those with `staleTime: Infinity`)
3. **Meta option with tags:** Store invalidation targets in mutation metadata, using `matchQuery` for fuzzy matching

**Hybrid Approach:** Combine global "fire-and-forget" invalidation with local mutations that specifically await important queries:

```typescript
// Global: invalidate everything immediately
// Local: await only ['labels'] before completing the mutation
```

**Guidance:** Favor simplicity first—global invalidation is often adequate. Optimize only if profiling shows real problems. Document intent using `meta` or `mutationKey` naming.

### Callback Execution Order

- Mutations await promises returned from callbacks
- `useMutation` callbacks fire before `mutate` callbacks
- Component unmounting prevents `mutate` callbacks from firing

**Separation of Concerns:**
- Place query logic (invalidation) in `useMutation` callbacks
- Place UI logic (redirects, toasts) in `mutate` callbacks

```typescript
// ✅ Recommended pattern
const useUpdateTodo = () =>
  useMutation({
    mutationFn: updateTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] })
  })

// In component
updateTodo.mutate(data, { onSuccess: () => navigate('/todos') })
```

### Mutate vs. MutateAsync

Use `mutate` in almost all cases—React Query handles errors gracefully. Reserve `mutateAsync` for concurrent mutations or rare Promise-specific needs. The `mutate` approach prevents unhandled rejections automatically.

### Return Value Handling

Always return promises from mutation callbacks when you need the mutation to remain in loading state during subsequent operations:

```typescript
// ✅ Waits for invalidation
onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })

// ❌ Fire-and-forget
onSuccess: () => { queryClient.invalidateQueries({ queryKey: [...] }) }
```

### Optimistic Updates: Red Flags

Only implement when instant feedback is genuinely required (toggle buttons, not form submissions in dialogs). The complexity cost is high:
- Position consistency in sorted lists
- ID generation for new entries
- Rollback UX is poor
- Duplicating server logic on the client

**Key insight:** "You're essentially trying to foresee what the server will do, and implement that on the client beforehand."

Consider simpler alternatives like button disabling with loading states first.

---

## Error Handling

### Three-Tier Error Strategy

1. **Local handling:** Component-level `error` property for validation errors (4xx)
2. **Boundaries:** Server errors (5xx) propagate to Error Boundaries
3. **Global callbacks:** Background failures trigger notifications without repetition

### Match Error Handling to Context

The standard pattern checking `isPending` before `error` works for initial loads but fails for background refetches. Don't unmount working UI just because a refresh failed—users still have stale data they can interact with.

### Data-First Checking Pattern

```typescript
// ✅ Better for background refetches
if (todos.data) return <div>{todos.data}</div>
if (todos.error) return 'Error occurred'
return 'Loading...'

// ❌ Problematic with stale-while-revalidate
if (todos.isPending) return 'Loading...'
if (todos.error) return 'Error message'
return <div>{todos.data}</div>
```

**Problem with status-first:** When background refetches fail, stale data vanishes behind error screens, confusing users since React Query retries three times with exponential backoff.

### Observer Behavior

The `onError` callback fires per observer, not per query. If a custom hook gets used twice, you'll get duplicate error notifications. Move shared error logic to the `QueryCache` level instead.

### Prerequisite: Proper Promise Rejection

Libraries like axios reject on HTTP error codes automatically. **The fetch API doesn't**—you must manually throw errors for non-2xx responses in your `queryFn`:

```typescript
const fetchTodos = async () => {
  const response = await fetch('/api/todos')
  if (!response.ok) {
    throw new Error('Failed to fetch todos')
  }
  return response.json()
}
```

### Code Review Checklist

- [ ] Is `throwOnError` appropriately scoped? Consider predicate functions for nuanced error distribution
- [ ] Are global callbacks (QueryCache/MutationCache) handling one-time notifications?
- [ ] Does local error state handling exist for 4xx errors (form validation)?
- [ ] Are Error Boundaries wrapping sections that should fail fast vs. degrade gracefully?
- [ ] Would a background refetch error harm UX? If so, show a toast; if not, stay silent
- [ ] Does the queryFn properly reject promises (especially with fetch API)?
- [ ] Are error handlers properly re-throwing after logging?

**Anti-Pattern:** Adding `onError` to every hook invocation instead of centralizing via QueryCache.

---

## Performance & Optimization

### Render Optimization Principles

React Query intentionally re-renders during background fetches to maintain data accuracy—a deliberate design choice prioritizing correctness over raw performance.

**Key insight:** "Re-renders are a good thing...I'd take an 'unnecessary re-render' over a 'missing render-that-should-have-been-there' all day every day."

### Tracked Queries (Recommended)

Enable automatic field tracking to avoid unnecessary re-renders:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { notifyOnChangeProps: 'tracked' }
  }
})
```

**How it works:** Components only re-render when fields they actually consume change. Tracking occurs during render only, not in effects.

**Limitations:**
- Avoid object rest destructuring (`...rest`)
- Field tracking occurs during render only, not in effects
- Tracking persists across render cycles

### Structural Sharing (Built-in)

React Query automatically preserves referential identity across nested data structures. When updating a single todo in a list, unchanged items retain their original references, preventing unnecessary child re-renders.

**Critical detail:** Structural sharing happens twice—once on the `queryFn` result, then once more on the selector function result.

### The select Option for Partial Subscriptions

The most powerful optimization for complex data:

```typescript
// Only subscribes to count, not entire dataset
const { data: count } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: (data) => data.length
})
```

Components ignore irrelevant mutations when using `select`. React Query uses structural sharing on `select` results, meaning you can safely return objects with multiple properties.

### Advanced Selector Patterns

**Performance Optimization with Memoization:**

```typescript
import memoize from 'fast-memoize'

const selectTodoById = memoize((id: number) =>
  (data: Todo[]) => data.find(todo => todo.id === id)
)

// In component
const { data: todo } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  select: selectTodoById(todoId)
})
```

This creates two caching layers:
1. React Query caches per observer
2. Memoization prevents re-computing the same transformation across observers

**Stabilize select functions:**

```typescript
// ✅ External definition (pure function)
const selectCompleted = (data) => data.filter(todo => todo.completed)

// ✅ With dependencies (use useCallback)
const selectByStatus = useCallback(
  (data) => data.filter(todo => todo.status === currentStatus),
  [currentStatus]
)
```

### The `isFetching` Re-render

Background refetches trigger two renders—one with `isFetching: true`, another with `isFetching: false`. This is intentional, not a bug.

### Code Review Red Flags

- Hard-coded `notifyOnChangeProps` lists that drift from actual component usage
- Premature optimization without measuring render performance
- Disabling structural sharing for large datasets without profiling impact
- Inline `select` functions without measurable performance issues
- Using `select` for small applications with simple data structures

---

## Status Checks

### Query State Machine

Three mutually exclusive states:
- `success`: Data available
- `error`: Error set
- `pending`: No data

The `isFetching` flag operates separately, allowing queries to simultaneously fetch while in any primary state.

### Data-First vs Status-First Checking

**Status-First (Problematic):**
```typescript
// ❌ Problematic with background refetches
if (todos.isPending) return 'Loading...'
if (todos.error) return 'Error message'
return <div>{todos.data}</div>
```

**Problem:** When background refetches fail, stale data vanishes behind error screens. React Query retries three times with exponential backoff, confusing users.

**Data-First (Better):**
```typescript
// ✅ Better
if (todos.data) return <div>{todos.data}</div>
if (todos.error) return 'Error occurred'
return 'Loading...'
```

### Code Review Checklist

- [ ] Does the component handle scenarios where both `data` and `error` exist simultaneously?
- [ ] Are background refetch failures causing unnecessary error screens over stale data?
- [ ] Is the application leveraging stale-while-revalidate semantics appropriately?
- [ ] Does UI indicate background fetching separately from initial load states?

**Context matters:** Status checking patterns depend entirely on use-case. Components should be conscious of React Query's aggressive background refetching behavior when designing state transitions.

---

## Forms Integration

### Server vs. Client State in Forms

**Server State:** Async data you don't control (fetched Person details)
**Client State:** Synchronous frontend data you manage (form field changes)

Forms blur this line—they display server data but track user modifications separately.

### Two Primary Approaches

#### 1. Simple Approach (Copy to Form State)

Use server data as initial values only. The form takes ownership of state.

**Advantages:**
- Simple implementation with `defaultValue`
- Works well for single-user scenarios

**Tradeoffs:**
- Background updates won't reflect in the form
- Risk of stale data in collaborative environments

**Recommendation:** Disable background updates via `staleTime: Infinity` if using this pattern, since refreshed data won't display anyway.

#### 2. Derived State Approach (Keep Separation)

Maintain server state in React Query and client state in the form separately. Display whichever is most current.

**Key insight:** "If the user has changed a field, show Client State. If not, fall back to Server State."

**Advantages:**
- Background updates remain relevant for untouched fields
- Handles collaborative editing better
- Users see latest changes from others

**Requirements:**
- Controlled form fields (nullish coalesce: `field.value ?? data.firstName`)
- More complex for nested objects

### Practical Integration Patterns

**Double-submit prevention:** Disable submit button using `isLoading` from `useMutation`.

**Form reset after success:** Return the invalidation Promise from `onSuccess` callback, then reset form state to `undefined` in a nested `onSuccess` handler. This allows server state to be picked up again.

### Code Review Guidance

1. Verify separation is intentional—copying state should never be accidental
2. Check that `staleTime` is appropriate for the chosen pattern
3. Ensure mutation handlers properly manage invalidation and reset timing
4. For collaborative features, verify the derived state pattern is used
5. Confirm controlled vs. uncontrolled field implementation matches the approach

---

## TypeScript Integration

### Type Inference Over Explicit Generics

**Best practice:** Provide explicit return types on your `queryFn` functions, then allow inference to handle the rest:

```typescript
function fetchGroups(): Promise<Group[]> {
  return axios.get('groups').then(response => response.data)
}

function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: fetchGroups })
}
```

This avoids the "Partial Type Argument Inference" gotcha where specifying one generic forces you to specify all four (`TQueryFnData`, `TError`, `TData`, `TQueryKey`).

**Golden Rule:** Generics must appear in multiple places to provide real value. Return-only generics are "type assertions in disguise"—they pretend to offer safety while actually bypassing compiler verification.

### Error Typing Strategy

The library defaults to `Error` type (v4+), but errors can technically be `unknown`. Use defensive narrowing:

```typescript
if (groupsQuery.error instanceof Error) {
  return <div>An error occurred: {groupsQuery.error.message}</div>
}
```

You can also register global errors via module augmentation for consistent error handling.

### Avoid Destructuring for Type Narrowing

Keep the full query object instead of destructuring. TypeScript can narrow types based on status fields when the object reference is maintained:

```typescript
const groupsQuery = useQuery(...)
if (groupsQuery.isSuccess) {
  // data is correctly narrowed to Group[], not Group[] | undefined
}
```

Destructuring breaks this type refinement (though TypeScript 4.6+ improved this with discriminated union support).

### Dependent Queries with `enabled`

When using `enabled` for conditional queries, explicitly check types in your `queryFn` rather than relying on the option for type safety. Alternatively, use `skipToken` (v5.25+) for type-safe query disabling.

### Runtime Validation with Zod

**The "trusted boundary" problem:** Backend responses may not match expected shapes. Type assertions provide false safety.

**Solution:** Schema validation addresses this by validating incoming data at runtime:

```typescript
import { z } from 'zod'

const TodoSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean()
})

type Todo = z.infer<typeof TodoSchema>

const fetchTodos = async (): Promise<Todo[]> => {
  const response = await fetch('/api/todos')
  const data = await response.json()
  return z.array(TodoSchema).parse(data) // Validates at runtime
}
```

**Benefits:**
- Validates incoming data at runtime
- Infers TypeScript types directly from schemas
- Converts failed validation into proper error states within React Query
- Makes trust verifiable rather than assumed

**Ideal pattern:** "The more your TypeScript code looks like JavaScript, the better." Validation and type inference should flow naturally without requiring developers to manually override generics.

### End-to-End Type Safety

For monorepo architectures controlling both frontend and backend, frameworks like **tRPC** or **zodios** enable automatic type synchronization—eliminating the gap between backend implementation and frontend assumptions.

### Code Review Checklist

- [ ] Are queryFn return types explicitly annotated?
- [ ] Is inference being used rather than manual generic specification?
- [ ] Are error handlers defensive (instanceof checks)?
- [ ] Does the code maintain object references instead of destructuring for type narrowing?
- [ ] For dependent queries, is runtime validation present in queryFn?
- [ ] Is runtime validation (Zod, etc.) used for external API responses?
- [ ] Do schemas validate data at the trust boundary?

---

## Testing

### Core Testing Patterns

**Test Isolation:** Create a fresh `QueryClient` for each test rather than clearing cache between tests. This prevents flaky parallel test execution and ensures complete independence.

**Network Mocking:** Use Mock Service Worker (MSW) as your single source of truth for API mocking. It works across testing environments, supports REST/GraphQL, and maintains consistency with development workflows.

### Essential Setup

**QueryClientProvider Wrapper:** Every test needs its own provider instance. For custom hooks, use `react-hooks-testing-library`'s wrapper pattern; for components, create a thin wrapper around `react-testing-library`'s render function.

**Disable Retries:** Set `retry: false` in your `QueryClient` defaults during testing. The library defaults to three retries with exponential backoff, causing timeouts during error scenarios.

### Anti-Patterns

**❌ Retry Configuration on useQuery:** Setting retry directly on individual queries prevents test-level overrides. Use `queryClient.setQueryDefaults()` instead to maintain test control while preserving production behavior.

**❌ Synchronous Assertions:** Don't assert on query results immediately after rendering. Always await state transitions using `waitFor()` to handle React Query's async nature.

### Code Review Checklist

- [ ] Tests have isolated `QueryClient` instances
- [ ] Network requests mocked via MSW or equivalent
- [ ] Retries disabled in test configuration
- [ ] Async queries awaited with `waitFor()` or similar
- [ ] Retry logic set via defaults/`setQueryDefaults`, not on individual queries
- [ ] No direct fetch/axios mocks (use MSW instead)
- [ ] Tests don't depend on external backends

---

## React Context Integration

### Core Distinction

React Query and React Context serve fundamentally different purposes:
- **React Query:** Data-fetching and caching layer
- **React Context:** Dependency injection mechanism, not state management

**Critical insight:** "React Context is a _dependency injection_ tool."

### When to Use Each

**React Query excels when:**
- Components need autonomous data fetching
- You want decoupled, resilient components that work anywhere in the tree
- Caching and synchronization matter
- Multiple components independently need the same data

**React Context fits when:**
- Data is mandatory for a subtree (user authentication, preferences)
- You need to make implicit dependencies explicit
- A parent component already handles loading/error states
- Child components should assume data availability

### The Problem: Implicit Dependencies

Components calling `useCurrentUserQuery()` throughout the app while silently assuming data exists creates invisible coupling. Refactoring becomes risky because the dependency isn't visible in code.

> "Our problem comes from the fact that we have an _implicit dependency_: A dependency that only exists in our head"

### The Solution Pattern

Wrap mandatory data in a Context Provider that handles loading/error states upfront:

```typescript
export const CurrentUserContextProvider = ({ children }) => {
  const currentUserQuery = useCurrentUserQuery()

  if (currentUserQuery.isPending) return <SkeletonLoader />
  if (currentUserQuery.isError) return <ErrorMessage />

  return (
    <CurrentUserContext.Provider value={currentUserQuery.data}>
      {children}
    </CurrentUserContext.Provider>
  )
}
```

Child components then safely consume without null-checks:

```typescript
function UserNameDisplay() {
  const data = useCurrentUserContext() // TypeScript knows it's defined
  return <div>User: {data.username}</div>
}
```

### Anti-Patterns

1. **State syncing myth:** Passing Query data through Context isn't "syncing"—Query remains the source of truth, Context just distributes it safely
2. **Using Context for state management:** Combine it with `useState`/`useReducer` and you'll face performance issues; use dedicated libraries instead
3. **Mixing concerns:** Don't put business logic queries inside Context; use Context only for dependency injection
4. **Missing type narrowing:** Add invariants to custom Context hooks to fail fast if used outside a Provider

### TypeScript Protection

```typescript
export const useCurrentUserContext = () => {
  const currentUser = React.useContext(CurrentUserContext)
  if (!currentUser) {
    throw new Error('CurrentUserContext: No value provided')
  }
  return currentUser
}
```

### Tradeoffs

Request waterfalls are the main cost—the Provider suspends rendering until data loads, preventing child components from firing independent requests. Reserve this pattern for truly mandatory data.

### Modern Alternative

React Query v5's `useSuspenseQuery` achieves similar type safety without Context overhead, automatically narrowing `data` as defined.

---

## Advanced Patterns

### Infinite Queries

#### Core Architecture

Infinite queries use a single `Query` instance with an attached `QueryBehavior` that distinguishes them from standard queries. The critical difference lies in data structure and retrieval logic—pages form a linked list where each depends on previous data.

#### Data Structure & PageParam

Each `queryFn` call returns one page. React Query reconstructs the full dataset by:
- Storing pages as an array in cache
- Using `getNextPageParam` to determine the next fetch parameter
- Maintaining a loop that re-fetches all previous pages during refetches

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['todos'],
  queryFn: ({ pageParam = 0 }) => fetchTodos({ page: pageParam }),
  getNextPageParam: (lastPage, allPages) => {
    // Return undefined when no more pages
    return lastPage.hasMore ? allPages.length : undefined
  },
  initialPageParam: 0 // v5+ required
})

// data.pages contains all fetched pages
// data.pages[0], data.pages[1], etc.
```

#### Critical Bug Pattern

"Have an Infinite Query that has already once successfully fetched multiple pages" combined with partial refetch failures can cause **infinite retry loops**, particularly with rate limiting. The retryer restarts the entire page-fetching loop rather than resuming from the failure point.

#### TypeScript Considerations

The `pageParam` is typed as `any` in v4. Explicitly annotate it using your response type structure, or provide an `initialPageParam` in v5+ for proper typing.

#### Code Review Checklist

- [ ] Verify closure handling: Check that `fetchFn` closures properly remember their position in page loops, especially across retries
- [ ] Test partial failures: Ensure refetch scenarios handle mid-loop errors gracefully without restarting from page one
- [ ] Retry strategy alignment: Confirm retry counts apply per-query, not per-page, matching single-query behavior
- [ ] State preservation: Validate that successfully fetched pages persist when subsequent pages fail
- [ ] Use `initialPageParam` in v5+ for type safety

### Placeholder vs Initial Data

#### Key Distinction

**initialData** operates at the cache level (persisted), while **placeholderData** works at the observer level (ephemeral). This fundamental difference determines behavior across refetches, error handling, and multi-observer scenarios.

#### When to Use Each

**Use initialData when:**
- Pre-filling from another query's cached data
- You have genuinely valid data worth persisting
- You want to respect `staleTime` settings
- Maintaining data across observer instances matters

**Use placeholderData when:**
- You need temporary UI filler during fetch
- Data validity is uncertain
- Each observer should potentially see different placeholder content
- You want guaranteed background refetch on mount

#### Critical Interaction: staleTime

initialData respects `staleTime`, potentially skipping background refetch if data is fresh. placeholderData always triggers background refetch regardless of time settings.

**Important:** If initial data is older than your `staleTime`, use `initialDataUpdatedAt` to provide the timestamp:

```typescript
initialData: () => queryClient.getQueryData(['source']),
initialDataUpdatedAt: () =>
  queryClient.getQueryState(['source'])?.dataUpdatedAt
```

#### Error Handling Differences

| Scenario | initialData | placeholderData |
|----------|------------|-----------------|
| Background refetch fails | Data persists; query enters error state | Data disappears; query enters error state |
| Recovery approach | Retry button with fallback data visible | Retry required to show any data |

#### Code Review Checklist

- [ ] Verify `initialDataUpdatedAt` is set when pre-filling stale data
- [ ] Check whether `isPlaceholderData` flag is used for UI hinting
- [ ] Confirm observer-level vs cache-level needs align with chosen approach
- [ ] Validate that error states won't confuse users (especially with placeholderData disappearing)
- [ ] Ensure `staleTime: 0` assumption is explicit if relying on background refetch

### Seeding the Query Cache

#### Key Principles

**Initiate fetches early.** The sooner a request starts, the sooner it finishes. Seeding prevents fetch waterfalls by populating the cache before components attempt to read data.

**Avoid Suspense waterfalls.** When multiple `useSuspenseQuery` hooks exist in one component without pre-populated cache, each query suspends sequentially rather than in parallel—dramatically extending loading times.

#### When to Seed

1. **Server-side rendering**: Fetch on the server and hydrate the cache
2. **Router loaders**: Prefetch during navigation before component mount
3. **List-to-detail transitions**: Populate detail cache from list data already fetched
4. **Route-based code splitting**: Execute prefetching as JavaScript bundle loads

#### Implementation Approaches

**Pull Approach (Lookup):**
Access existing cache entries to populate new queries via `initialData`:

```typescript
initialData: () =>
  queryClient.getQueryData(['todos', 'list'])
    ?.find((todo) => todo.id === id),
initialDataUpdatedAt: () =>
  queryClient.getQueryState(['todos', 'list'])?.dataUpdatedAt
```

**Trade-off:** Needs more work to account for staleness—pair with `initialDataUpdatedAt` to track original fetch time.

**Push Approach (Creation):**
Populate detail caches immediately after fetching list data within the `queryFn`:

```typescript
queryFn: async () => {
  const todos = await fetchTodos()
  todos.forEach((todo) => {
    queryClient.setQueryData(['todos', 'detail', todo.id], todo)
  })
  return todos
}
```

**Trade-off:** Created entries may be garbage collected before needed; unnecessary entries created for long lists.

**Prefetching:**
Trigger fetches before component render using `prefetchQuery`. Ideal for route transitions where code splitting delays evaluation until navigation occurs:

```typescript
// In route loader or navigation handler
await queryClient.prefetchQuery({
  queryKey: ['todos', id],
  queryFn: () => fetchTodo(id)
})
```

#### Code Review Guidance

- Verify cache structure compatibility: seeding fails if detail schema requires fields absent from list data
- Confirm staleness configuration: `initialDataUpdatedAt` prevents unnecessary refetches when list data is fresh
- Assess prefetch timing: ensure fetches initiate before user interaction, not after component mount
- Evaluate cleanup: push approach requires monitoring garbage collection (`gcTime`) against realistic navigation patterns
- Check for over-seeding: avoid creating hundreds of cache entries users may never access

**Best Practice:** "Use `placeholderData`" when detail structure diverges from list structure—it indicates incomplete data without false freshness guarantees that `initialData` provides.

### WebSockets Integration

#### Core Approach

React Query doesn't require built-in WebSocket support because it's "very agnostic when it comes to how you fetch your data: All it needs is a resolved or rejected Promise to work."

**Integration pattern:**
- Maintain standard HTTP queries initially
- Set up app-wide WebSocket connection separately
- Use the connection to trigger cache updates rather than replace queries

#### Real-Time Update Strategies

**Query Invalidation (Recommended):**

Send events from the backend describing *what changed*, not complete data objects:

```typescript
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data)
  const queryKey = [...data.entity, data.id].filter(Boolean)
  queryClient.invalidateQueries({ queryKey })
}
```

**Benefits:**
- Only refetches data when components actively observe it
- Prevents unnecessary network requests for unused cached data
- Naturally handles unobserved queries without redundant updates

**Partial Updates:**

For high-frequency, small updates, use `setQueriesData` to update cache directly without refetching. This requires careful implementation for type safety and handling additions/deletions.

#### StaleTime Configuration

When WebSockets handle all real-time updates, increase `staleTime` significantly:

```typescript
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } }
})
```

This prevents unnecessary refetches since invalidation events trigger updates explicitly. The initial query fetch populates the cache; subsequent data flows through WebSocket events.

#### Code Review Checklist

- [ ] Are WebSocket subscriptions cleaned up in effect cleanup functions?
- [ ] Is `queryClient` properly injected via `useQueryClient()`?
- [ ] Does the solution gracefully handle cases where queries aren't cached yet?
- [ ] Are event shapes designed to match existing query keys?
- [ ] Is `staleTime` appropriately configured to prevent refetch conflicts?

### Offline Support

#### Core Concepts

React Query v4 introduced `networkMode` to handle offline scenarios robustly. The library distinguishes between two states:

- `status`: Reflects data availability (success/loading/error)
- `fetchStatus`: Indicates query execution (fetching/paused/idle)

#### Three Network Modes

**1. Online (Default):**
Queries pause when offline rather than failing. This prevents unnecessary errors but requires network for execution.

```typescript
{isPaused && <OfflineNotice />}
{isLoading && !isPaused && <Spinner />}
```

**2. Always:**
Ignores network status entirely. Suitable for non-network async operations (web workers, expensive computations).

**3. OfflineFirst:**
Attempts requests immediately; pauses retries on failure if offline. Respects browser caching headers.

#### Best Practices

- **Expose `fetchStatus`** alongside traditional status flags; don't hide the paused state from users
- **Set networkMode per-query** if heterogeneous requirements exist
- **Test offline scenarios** using React Query's devtools network mode toggle
- **Handle `isPaused` independently** from retry logic; they're separate concerns

#### Code Review Checklist

- [ ] UI differentiates between loading and paused states
- [ ] Network mode matches query requirements (network vs computation)
- [ ] Offline scenarios are tested
- [ ] Persistence strategy (if any) handles partial sync states

### React Router Integration

#### Core Principle

React Router's loaders handle **when** data fetches (early, at navigation time), while React Query manages **what** (caching, freshness, background updates). They're complementary, not competing.

As the Remix team notes: "React Router is not a cache."

#### Key Integration Patterns

**Loader with QueryClient Access:**

```typescript
export const loader = (queryClient) => async ({ params }) => {
  const query = contactDetailQuery(params.contactId)
  return queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
}
```

This pattern returns cached data immediately if available, otherwise fetches fresh data.

**Component-Level Query Usage:**

Combine `useLoaderData()` for initial hydration with `useQuery()` for ongoing cache management:

```typescript
const initialData = useLoaderData()
const { data } = useQuery({
  ...contactQuery(id),
  initialData
})
```

This ensures TypeScript recognizes data as non-optional while preserving reactive updates.

**Invalidation Strategy in Actions:**

Control timing with the `await` keyword:

```typescript
export const action = (queryClient) => async ({ request, params }) => {
  await updateContact(params.contactId, updates)
  queryClient.invalidateQueries({ queryKey: ['contacts'] })
  return redirect(`/contacts/${params.contactId}`)
}
```

- **Without await**: Redirect immediately, refresh data in background (better UX)
- **With await**: Block transition until data refreshes (prevents layout shifts)

#### Code Review Checklist

- [ ] Loaders receive QueryClient explicitly, not via globals
- [ ] Use fuzzy matching in `invalidateQueries()` for related queries
- [ ] Prefer `getQueryData ?? fetchQuery` over `prefetchQuery` to handle errors
- [ ] Pass `initialData` from loaders to `useQuery()` for proper typing
- [ ] Document await decisions for transition timing

### Concurrent Optimistic Updates

#### Core Challenge

The fundamental difficulty with optimistic updates lies in **duplicating server logic on the client**. "You're essentially trying to foresee what the server will do, and implement that on the client beforehand." This becomes increasingly complex with realistic scenarios—filtering logic, validation rules, and business constraints often require substantial client-side reimplementation.

#### Race Condition: The Window of Inconsistency

A critical vulnerability emerges when queries and mutations overlap:

1. **Query Cancellation Required**: Without explicitly canceling in-flight queries during `onMutate`, an optimistic update can be overwritten when a competing request resolves, creating UI flickering.

2. **Concurrent Mutation Problem**: Multiple rapid mutations targeting the same entity create a harder scenario. When the first mutation settles and triggers invalidation, it may refetch faster than the second mutation completes, reverting the second mutation's optimistic state.

#### Actionable Solution: Conditional Invalidation

Rather than always invalidating on settlement, check if related mutations are still active:

```typescript
onSettled: () => {
  if (queryClient.isMutating({ mutationKey: ['items'] }) === 1) {
    queryClient.invalidateQueries({ queryKey: ['items', 'detail', id] })
  }
}
```

The count equals 1 because the current mutation is still technically in-flight during `onSettled`. This pattern prevents "over-invalidation" where premature refetches undo subsequent mutations.

#### Best Practices for Code Review

- [ ] Verify query cancellation in `onMutate` for all optimistic mutations
- [ ] Scope mutation keys to enable granular `isMutating()` checks
- [ ] Question complex filter logic—if optimistic update requires filtering by multiple fields, benefit may not justify maintenance burden
- [ ] Ensure rollback logic (using `onError`) gracefully handles failed mutations
- [ ] Validate that UI clearly indicates optimistic state vs confirmed state

---

## Understanding React Query Internals

### Core Components

**QueryClient** - The entry point. A stable container created once at app startup via `QueryClientProvider`. Distributes access through React Context without triggering re-renders.

**QueryCache** - An in-memory object storing queries by serialized key hash. Data persists only during the session unless explicitly persisted to external storage.

**Query** - The computational engine. Manages:
- State machine logic preventing impossible states
- Retry and cancellation handling
- De-duplication of redundant fetches
- Observer notification on state changes

**QueryObserver** - Created per `useQuery` call. Maintains subscription to exactly one query. Optimizes updates by:
- Tracking which properties the component uses
- Supporting `select` for granular data subscriptions
- Managing timers for `staleTime` and polling

### Subscription Model

Observers subscribe to queries, creating dependency relationships:
- **Active queries**: Have ≥1 observer subscribed
- **Inactive queries**: In cache but unused (greyed in DevTools)

Updates flow: Query state change → Observer notified → Optimization checks → Conditional component re-render

### Framework Agnosticism

The Query Core (`QueryClient`, `QueryCache`, `Query`, `QueryObserver`) is framework-agnostic. Framework adapters need only ~100 lines to: create observers, manage subscriptions, trigger re-renders on notifications.

### Mental Model

**Most logic executes outside React.** Components mount, create observers, subscribe to queries, then respond to state machine updates—not the reverse.

---

## Limitations & Gotchas

### No Normalized Caching

React Query uses **document-level caching only**. "In a normalized cache, every piece of data is stored once, and other parts only reference it, to avoid data duplication."

This means identical entities across different queries will be cached separately, leading to duplication. For GraphQL applications requiring normalized caching, consider Apollo Client or urql instead.

### Async State Only

Avoid using React Query for synchronous client state (UI toggles, forms, preferences). The library is specifically designed for server state synchronization. Using it for non-async data requires disabling core features and creates verbose, inefficient code.

### Size Considerations

The library adds ~9.6KB minzipped for basic usage (QueryClient, Provider, useQuery, useMutation). This pays for itself through code saved versus custom implementations, especially regarding cache invalidation complexity. Bundle concerns are often overstated relative to actual impact.

### API Learning Curve

While the library has extensive features, you can start productively with just `useQuery` and `useMutation`. The API is "designed to evolve with you"—complex features like infinite queries and optimistic updates come later. Don't attempt to learn everything upfront.

### Code Review Watchpoints

1. **Imperative refetching**: Don't pass arguments to `refetch()`. Make filter/parameter changes part of the query key instead.

2. **State mixing**: Never store synchronous UI state in React Query. Use zustand, xstate/store, or React Context for that.

3. **Over-configuration**: Turning off stale-while-revalidate or background refetching for every query suggests React Query may not fit your use case.

4. **Query key design**: Ensure dependencies are encoded in keys to prevent cache collisions and race conditions.

---

## When You Might Not Need React Query

### React Query Solves a Specific Problem

React Query solves the problem of managing asynchronous state on the client side. The maintainer's core thesis: use tools only when they solve genuine problems you're facing.

### When to Skip React Query

**Server Components change the equation.** With modern frameworks like Next.js or Remix offering built-in data fetching via server-side rendering, traditional client-side async state management becomes less critical. "If your data fetching happens on the server exclusively—why would you need it?"

**Starting fresh?** New applications built on mature frameworks with native data-fetching stories don't require React Query. Use the framework's native solutions instead.

**Simple requirements.** If you're primarily fetching data and displaying it without complex client-side state needs, framework defaults usually suffice.

### When React Query Still Makes Sense

- **Incremental migration:** Existing applications transitioning to Server Components can adopt them gradually while maintaining React Query where needed
- **Advanced patterns:** Infinite scrolling lists, offline support, interval-based refetching, and sophisticated cache management benefit from Query's capabilities
- **Hybrid architectures:** Prefetching initial data server-side, then managing updates client-side
- **Beyond data fetching:** Using Query as a general async state manager for non-HTTP operations

### The Bottom Line

There's no universally correct choice. Server Components represent progress, not a replacement that renders Query obsolete. The decision depends on your specific architecture, requirements, and constraints.

---

## FAQs & Common Issues

### 1. Refetching with Parameters

**Misconception:** You can pass new parameters to `refetch()`.

**Reality:** Query keys define all dependencies. Instead of refetching with new parameters, update the key's dependency:

```typescript
const [id, setId] = useState(1)
const { data } = useQuery({
  queryKey: ['item', id],
  queryFn: () => fetchItem({ id })
})
```

Use `keepPreviousData` (v4) or `placeholderData: keepPreviousData` (v5) to avoid hard loading states during transitions.

### 2. Updates Not Reflecting

**Two common causes:**

**Issue A:** Query key mismatches (e.g., string `'1'` vs. number `1`). Use React Query DevTools to verify exact key formats and TypeScript + Query Key Factories to prevent this.

**Issue B:** Unstable QueryClient. Create the client outside your App component or use `useState` with a factory function to maintain referential stability:

```typescript
// ✅ Stable
const queryClient = new QueryClient()

function App() {
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}

// ✅ Also stable
function App() {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>...</QueryClientProvider>
}
```

### 3. Using `useQueryClient()` vs. Importing

**Best Practice:** Always use the hook.

**Why:**
- "useQuery uses the hook too" (ensures consistency)
- Enables dependency injection for testing (e.g., disabling retries)
- Required when the client must be created inside App (SSR, microfrontends, custom hooks)

### 4. Errors Not Appearing

**Root Cause:** Your `queryFn` doesn't return a rejected Promise.

- **fetch API**: Doesn't reject on 4xx/5xx status codes; check `response.ok`
- **Error logging**: Always re-throw caught errors; don't silently return

```typescript
try {
  const { data } = await axios.get('/todos')
  return data
} catch (error) {
  console.error(error)
  throw error  // ✅ Essential
}
```

### 5. queryFn Never Called

**Primary cause:** Combining `initialData` with `staleTime`.

Initial data is cached immediately and marked fresh for the duration. Use `placeholderData` instead (never cached) or set `initialDataUpdatedAt: 0` to force background refetch.

**With dynamic keys** (pagination): Conditionally apply `initialData` only to specific keys to avoid unintended caching.

### Code Review Checklist

- [ ] Query keys include all dependencies
- [ ] QueryClient created outside component (or with `useState` factory)
- [ ] Using hooks (`useQueryClient`) not direct imports
- [ ] `queryFn` returns rejected Promise on errors
- [ ] Using `placeholderData` for fallbacks, not `initialData`
- [ ] Fetching with `fetch`? Check `response.ok`

---

## Essential Patterns

### Pre-filtering with `initialData`

When switching between filter states, use `initialData` to populate new cache entries from existing data:

```typescript
initialData: () => {
  const allTodos = queryClient.getQueryData(['todos', 'all'])
  return allTodos?.filter(todo => todo.state === state)
}
```

This prevents hard loading states during filter transitions.

### Never Copy Server Data to Local State

Avoid placing query results into `useState`. This breaks background updates and creates stale "copies." Only use local state for truly independent values (form drafts with `staleTime: Infinity`).

### Leverage the `enabled` Option

Control query execution for:
- Dependent queries
- Temporary pauses
- Conditional fetching
- User-input-gated requests

Far more powerful than manual effect management.

### Create Custom Hooks (When Needed)

Co-locating queries, type definitions, and transformations in one place pays dividends. However, with the Query Options API, simple wrappers around `useQuery` are no longer necessary—use `queryOptions` instead.

**When custom hooks still make sense:**
- Composing multiple queries together
- Adding component-specific state/logic
- Combining client state with server state
- Wrapping with additional error handling or transformations

### Use Query Options API for Reusability

Define queries as reusable objects with `queryOptions`:

```typescript
const todoQuery = queryOptions({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000
})

// Use everywhere:
useQuery(todoQuery)
prefetchQuery(todoQuery)
queryClient.getQueryData(todoQuery.queryKey)
```

---

## Anti-Patterns to Avoid

1. **Using queryCache as state manager** — Only modify cache for optimistic updates or mutation results. Background refetches will override arbitrary mutations.

2. **Calling `refetch()` when parameters change** — Update the query key instead; queries are declarative.

3. **Copying query data into local/global state** — This creates synchronization debt and destroys the single source of truth.

4. **Disabling all revalidation triggers** — Configure `staleTime` appropriately instead of fighting the design.

5. **Adding `onError` to every hook invocation** — Centralize via QueryCache for shared error logic.

6. **Setting retry on individual queries** — Use `queryClient.setQueryDefaults()` to maintain test control.

7. **Synchronous assertions in tests** — Always await state transitions with `waitFor()`.

8. **Using Context for state management** — Use dedicated libraries; Context is for dependency injection.

9. **Simple custom hook wrappers** — Use `queryOptions` instead for reusability without indirection.

10. **Inline select functions** — Use stable references unless you have measured performance issues.

11. **Manual generic specification** — Let TypeScript infer types from properly-typed `queryFn` return values.

12. **Type assertions instead of runtime validation** — Use Zod or similar at the trust boundary with external APIs.

---

## Debugging & Developer Experience

- Use React Query DevTools to inspect query state and cache contents
- Throttle network in browser DevTools to observe background refetches more clearly
- Note: `refetchOnWindowFocus` triggers on visibility changes, causing frequent dev-mode refetches
- Run `eslint-plugin-react-query` to catch common mistakes automatically
- Use React Query's devtools network mode toggle for offline testing
- Check QueryCache state to understand observer subscriptions and active queries

---

*This comprehensive reference covers all 31 posts from TkDodo's Practical React Query blog series. For deeper dives into specific topics, refer to the original posts at https://tkdodo.eu/blog/practical-react-query*
