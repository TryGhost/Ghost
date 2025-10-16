# Gradual React 17 to React 18 Migration Guide for Small Apps

React 18 fully supports class components and enables incremental migration—you don't need to convert everything to hooks immediately. For small apps with dozens of components using legacy React 17 patterns, **you can upgrade to React 18 in 1-2 weeks** using automated tooling and phased validation, then gradually convert components to functional patterns at your own pace. The key insight: automatic batching, concurrent features, and improved performance work with class components out of the box.

**Why it matters:** React 18 brings automatic batching (fewer re-renders), concurrent rendering foundations, better SSR with Suspense, and future-proofing—all while maintaining full backward compatibility. Migration effort is low to medium for well-maintained codebases, higher for legacy code using UNSAFE_ lifecycle methods without proper cleanup.

**Backstory:** Released March 2022, React 18 represents the biggest architectural shift in React's history with concurrent rendering, yet the team designed it for gradual adoption. Testing of "thousands of components" confirmed most applications work without changes. The new `createRoot` API unlocks new features while `ReactDOM.render` provides a compatibility escape hatch.

**Implications:** Small apps benefit from immediate performance gains and can convert to hooks incrementally as needs arise. Class components remain fully supported with no deprecation timeline. This guide provides a battle-tested strategy used by companies like SeatGeek and the Backstage platform.

## Understanding React 18's breaking changes for class components

React 18 introduces three changes that directly affect class components: automatic batching everywhere, aggressive StrictMode remounting in development, and refined root APIs. **Class components remain fully supported**—the React team explicitly committed to this.

**Automatic batching** now groups all state updates into single re-renders, even inside promises, setTimeout, and native event handlers. In React 17, only updates inside React event handlers were batched. This improves performance automatically but can break edge cases where code reads DOM state between `setState` calls. For components that depend on intermediate DOM measurements, use `flushSync` from `react-dom` to force synchronous updates:

```javascript
import { flushSync } from 'react-dom';

handleClick = () => {
  flushSync(() => {
    this.setState({ count: this.state.count + 1 });
  });
  // React has updated DOM by now
  const height = this.divRef.current.offsetHeight;
  this.setState({ height });
};
```

**StrictMode now simulates mount-unmount-remount cycles** in development to prepare for future "reusable state" features. This exposes cleanup issues in class components that assume single mounting. Components must properly clean up subscriptions, event listeners, timers, and async operations in `componentWillUnmount`. The lifecycle sequence in development becomes: mount → create effects → unmount (simulated) → remount with previous state. This double-mounting behavior catches memory leaks early but only runs in development.

**The new root API** is required to access React 18 features. Switching from `ReactDOM.render` to `createRoot` enables automatic batching, concurrent rendering capabilities, and improved Suspense. Until you switch, your app runs in React 17 compatibility mode with deprecation warnings:

```javascript
// React 17 approach (still works but limited)
import { render } from 'react-dom';
render(<App />, document.getElementById('root'));

// React 18 approach (enables new features)
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

TypeScript users face one additional change: **children props are no longer implicit** in component types. You must explicitly declare `children?: React.ReactNode` in your props interfaces. The `types-react-codemod` tool automates this fix.

### Deprecated patterns that trigger warnings

Five legacy patterns generate warnings in React 18 and will be removed in React 19: UNSAFE_ lifecycle methods, findDOMNode, string refs, legacy context API, and renderSubtreeIntoContainer.

**UNSAFE_ lifecycle methods** (componentWillMount, componentWillReceiveProps, componentWillUpdate) were renamed in React 16.3 and remain deprecated. These methods are incompatible with concurrent rendering because they can be called multiple times during interrupted renders. Migration paths are clear:

- `componentWillMount` → Initialize state in constructor, move side effects to `componentDidMount`
- `componentWillReceiveProps` → Use static `getDerivedStateFromProps` for state derivation, `componentDidUpdate` for side effects
- `componentWillUpdate` → Use `getSnapshotBeforeUpdate` to capture DOM info before updates, `componentDidUpdate` for post-update logic

**findDOMNode** breaks abstraction boundaries, only returns the first child (breaking with Fragments), and executes slowly. Replace with `createRef`:

```javascript
// Deprecated approach
const node = ReactDOM.findDOMNode(this);
node.style.color = 'red';

// Modern approach with refs
class MyComponent extends React.Component {
  nodeRef = React.createRef();

  handleClick = () => {
    this.nodeRef.current.style.color = 'red';
  };

  render() {
    return <div ref={this.nodeRef}>Content</div>;
  }
}
```

**Legacy context API** (childContextTypes, getChildContext) had subtle bugs and only worked in class components. Migrate to the modern Context API created with `React.createContext()`. Class components can consume modern context using static `contextType` or Context.Consumer.

**String refs** (`<input ref="myInput" />`) have been deprecated since React 16.3. Convert to `createRef()` or callback refs.

## Converting class components to functional components with hooks

The conversion from class to functional components maps lifecycle methods, state, and refs to hooks. While not required for React 18, converting to hooks enables access to new concurrent features and improves code reusability through custom hooks.

### Essential lifecycle to hooks mappings

**componentDidMount and componentWillUnmount** both map to `useEffect` with an empty dependency array. The cleanup function returned from useEffect handles unmounting:

```javascript
// Class component
class DataFetcher extends React.Component {
  componentDidMount() {
    this.subscription = DataSource.subscribe(this.handleData);
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }
}

// Functional equivalent
function DataFetcher() {
  useEffect(() => {
    const subscription = DataSource.subscribe(handleData);
    return () => subscription.unsubscribe(); // Cleanup
  }, []); // Empty array = mount/unmount only
}
```

**componentDidUpdate** maps to `useEffect` with dependencies. The effect runs whenever listed dependencies change:

```javascript
// Class component
componentDidUpdate(prevProps) {
  if (prevProps.userId !== this.props.userId) {
    this.fetchUser(this.props.userId);
  }
}

// Functional equivalent
useEffect(() => {
  fetchUser(userId);
}, [userId]); // Runs when userId changes
```

**shouldComponentUpdate** becomes `React.memo` for shallow prop comparisons or custom comparison functions:

```javascript
// Class component
class UserCard extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.user.id !== this.props.user.id;
  }
  render() {
    return <div>{this.props.user.name}</div>;
  }
}

// Functional equivalent with custom comparison
const UserCard = React.memo(
  ({ user }) => <div>{user.name}</div>,
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
);
```

**getDerivedStateFromProps** should usually be eliminated by computing values during render. For cases where you truly need derived state, update state during render or use useEffect:

```javascript
// Avoid derived state pattern - compute during render instead
function UserCard({ user }) {
  const fullName = `${user.firstName} ${user.lastName}`; // No state needed
  return <div>{fullName}</div>;
}

// For expensive computations, use useMemo
const processedData = useMemo(() => {
  return expensiveTransform(data);
}, [data]);
```

**getSnapshotBeforeUpdate** requires `useLayoutEffect` with refs to capture DOM measurements before mutations:

```javascript
function ChatFeed({ messages }) {
  const chatRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useLayoutEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const snapshot = chatRef.current.scrollHeight - chatRef.current.scrollTop;
      chatRef.current.scrollTop = chatRef.current.scrollHeight - snapshot;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  return <div ref={chatRef}>{/* messages */}</div>;
}
```

**Error boundaries remain class-only**. There are no hook equivalents for `componentDidCatch` or `getDerivedStateFromError`. Keep these as class components and wrap functional components with them.

### State management and refs patterns

**State conversion** is straightforward but with one critical difference: `setState` in classes merges objects automatically; `useState` replaces the entire state. Use multiple `useState` calls for independent values or spread syntax when updating objects:

```javascript
// Class component
class UserForm extends React.Component {
  state = { username: '', email: '', age: 0 };

  updateUsername = (username) => {
    this.setState({ username }); // Automatic merge
  };
}

// Functional component - Option 1: Separate state
function UserForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);
}

// Functional component - Option 2: Object state (manual merge)
function UserForm() {
  const [form, setForm] = useState({ username: '', email: '', age: 0 });

  const updateUsername = (username) => {
    setForm(prev => ({ ...prev, username })); // Must spread!
  };
}
```

**Functional state updates** prevent stale closure bugs. When new state depends on previous state, always use the callback form:

```javascript
// Risky - can capture stale values in closures
setCount(count + 1);

// Safe - always uses latest state
setCount(prevCount => prevCount + 1);
```

**Refs** map directly from `createRef()` to `useRef()` with identical behavior for DOM access. The key insight: `useRef` also stores mutable values that persist across renders without triggering re-renders:

```javascript
// Class component - DOM ref
class TextInput extends React.Component {
  inputRef = React.createRef();
  focusInput = () => this.inputRef.current.focus();
  render() {
    return <input ref={this.inputRef} />;
  }
}

// Functional component - DOM ref
function TextInput() {
  const inputRef = useRef(null);
  const focusInput = () => inputRef.current.focus();
  return <input ref={inputRef} />;
}

// Functional component - mutable value storage
function Timer() {
  const intervalIdRef = useRef(null);

  useEffect(() => {
    intervalIdRef.current = setInterval(() => tick(), 1000);
    return () => clearInterval(intervalIdRef.current);
  }, []);
}
```

### Context and HOC conversion strategies

**Legacy Context API** must migrate to modern context. Class components can consume modern context using static `contextType` or Context.Consumer:

```javascript
// Create modern context
const ThemeContext = React.createContext('light');

// Class provider (or functional with hooks)
class ThemeProvider extends React.Component {
  render() {
    return (
      <ThemeContext.Provider value={this.props.theme}>
        {this.props.children}
      </ThemeContext.Provider>
    );
  }
}

// Functional consumer with useContext
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button style={{ background: theme }}>Click</button>;
}
```

**Higher-Order Components (HOCs) convert beautifully to custom hooks**, removing wrapper hell and improving code clarity:

```javascript
// HOC pattern (before)
function withFetch(WrappedComponent, url) {
  return class extends React.Component {
    state = { data: null, loading: true };
    componentDidMount() {
      fetch(url)
        .then(res => res.json())
        .then(data => this.setState({ data, loading: false }));
    }
    render() {
      return <WrappedComponent {...this.props} {...this.state} />;
    }
  };
}
const UserList = withFetch(UserListComponent, '/api/users');

// Custom hook pattern (after)
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [url]);

  return { data, loading };
}

function UserList() {
  const { data, loading } = useFetch('/api/users');
  if (loading) return <div>Loading...</div>;
  return <ul>{data.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

## Avoiding critical pitfalls when using hooks

Three categories of bugs account for 90% of hook conversion issues: dependency array problems, infinite loops, and stale closures. Understanding these patterns prevents hours of debugging.

### Dependency array mistakes and solutions

The `eslint-plugin-react-hooks` rule catches most dependency issues automatically—enabling this rule is non-negotiable. **The exhaustive-deps rule enforces including all values from component scope used inside effects**. Missing dependencies cause stale closures; unnecessary dependencies cause extra effect runs.

```javascript
// Wrong - missing dependency
useEffect(() => {
  fetchData(userId); // userId not in deps!
}, []); // Captures initial userId forever

// Correct - include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]); // Re-fetches when userId changes

// Wrong - object dependency created each render
useEffect(() => {
  processData(config);
}, [{ api: apiUrl, timeout: 5000 }]); // New object = infinite loop

// Correct - use useMemo for stable object reference
const config = useMemo(() => ({ api: apiUrl, timeout: 5000 }), [apiUrl]);
useEffect(() => {
  processData(config);
}, [config]);

// Correct alternative - use primitive dependencies
useEffect(() => {
  processData({ api: apiUrl, timeout: 5000 });
}, [apiUrl]); // Only primitive value as dependency
```

**Functions as dependencies** require `useCallback` to maintain stable references across renders. Without memoization, functions are recreated every render, causing effects to re-run unnecessarily:

```javascript
// Creates new function every render
const handleClick = () => doSomething(value);
useEffect(() => {
  subscribe(handleClick);
  return () => unsubscribe(handleClick);
}, [handleClick]); // Effect re-runs every render

// Stable function reference with useCallback
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
useEffect(() => {
  subscribe(handleClick);
  return () => unsubscribe(handleClick);
}, [handleClick]); // Only re-runs when value changes
```

### Infinite loop patterns and prevention

**No dependency array** means the effect runs after every render, which often triggers a state update, causing another render—infinite loop:

```javascript
// Infinite loop - effect runs every render
useEffect(() => {
  setCount(count + 1); // Triggers render, effect runs again
}); // No deps array!

// Fixed - runs once on mount
useEffect(() => {
  setCount(prev => prev + 1);
}, []); // Empty array = mount only
```

**Object or array state as dependency** creates infinite loops because JavaScript comparison uses reference equality. Arrays and objects created during render have new references every time:

```javascript
// Infinite loop
const [items, setItems] = useState([]);
useEffect(() => {
  setItems([1, 2, 3]); // New array reference triggers effect again
}, [items]); // Array comparison always fails

// Fix 1 - use primitive dependency
useEffect(() => {
  setItems([1, 2, 3]);
}, [items.length]); // Primitive comparison works

// Fix 2 - run once
useEffect(() => {
  setItems([1, 2, 3]);
}, []); // Only set initial items

// Fix 3 - useMemo for stable array reference
const processedItems = useMemo(() => {
  return items.map(transform);
}, [items]); // Only recreates when items identity changes
```

### Stale closure debugging and resolution

**Stale closures** occur when functions capture variable values from a previous render. This is the most subtle hook bug because code appears correct but uses outdated data:

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // Always logs 0!
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps = captures initial count (0)

  return <button onClick={() => setCount(count + 1)}>Increment</button>;
}
```

**Three solutions** exist for stale closures, each appropriate for different scenarios:

```javascript
// Solution 1: Include in dependencies (simple but recreates effect)
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // Always current
  }, 1000);
  return () => clearInterval(id);
}, [count]); // Recreate interval when count changes

// Solution 2: Functional updates (best for state updates)
useEffect(() => {
  const id = setInterval(() => {
    setCount(prevCount => prevCount + 1); // Always uses latest
  }, 1000);
  return () => clearInterval(id);
}, []); // Stable - no dependencies needed

// Solution 3: useRef for latest value (best for logging/side effects)
const countRef = useRef(count);
useEffect(() => { countRef.current = count; }); // Updates every render

useEffect(() => {
  const id = setInterval(() => {
    console.log(countRef.current); // Always current value
  }, 1000);
  return () => clearInterval(id);
}, []); // Stable - ref.current always updated
```

### Cleanup function critical importance

**Every side effect needs cleanup**—subscriptions, event listeners, timers, async operations. Missing cleanup causes memory leaks, duplicate operations, and test failures. StrictMode's remounting behavior in development exposes these issues immediately:

```javascript
function DataSubscription({ dataId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Setup
    const subscription = DataSource.subscribe(dataId, setData);
    const listener = window.addEventListener('resize', handleResize);
    const timer = setInterval(checkStatus, 5000);

    // Cleanup - CRITICAL
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, [dataId]);
}
```

**Async operation cleanup** prevents race conditions when components unmount before fetch completes:

```javascript
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function search() {
      const data = await searchAPI(query);
      if (!cancelled) { // Check before updating state
        setResults(data);
      }
    }

    search();

    return () => {
      cancelled = true; // Prevent state update on unmounted component
    };
  }, [query]);
}
```

## Performance optimization with hooks

React's performance optimization hooks (useMemo, useCallback, React.memo) prevent unnecessary work but come with overhead. **Profile before optimizing**—premature optimization adds complexity and memory usage without guaranteed benefits.

### When to use useMemo and useCallback

**useMemo** caches expensive computation results, recomputing only when dependencies change. Use for calculations that measurably slow down renders:

```javascript
// Good use - expensive filtering and sorting
const filteredData = useMemo(() => {
  return data
    .filter(item => item.active)
    .sort((a, b) => a.value - b.value)
    .map(item => expensiveTransform(item));
}, [data]);

// Bad use - simple concatenation (overhead exceeds benefit)
const fullName = useMemo(
  () => `${firstName} ${lastName}`,
  [firstName, lastName]
);
```

**useCallback** creates stable function references, preventing child components from re-rendering. Only useful when passing functions to memoized child components:

```javascript
// Effective - child is memoized and won't re-render unnecessarily
const Child = React.memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});

function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []); // Stable reference

  return <Child onClick={handleClick} />;
}

// Ineffective - no memoized child, useCallback adds overhead without benefit
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <button onClick={handleClick}>Click</button>;
}
```

### React.memo usage patterns

**React.memo** prevents functional component re-renders when props haven't changed (equivalent to PureComponent for classes). Default behavior performs shallow comparison of all props:

```javascript
// Basic usage - shallow comparison
const ExpensiveList = React.memo(({ items }) => {
  return (
    <ul>
      {items.map(item => <ComplexItem key={item.id} item={item} />)}
    </ul>
  );
});

// Custom comparison for deep or selective equality
const UserCard = React.memo(
  ({ user, onEdit }) => <div>{user.name}</div>,
  (prevProps, nextProps) => {
    // Return true to SKIP re-render
    return prevProps.user.id === nextProps.user.id;
  }
);
```

**React.memo pitfalls**: Inline objects or functions as props break memoization because they create new references every render:

```javascript
// Broken - new object/function every render negates React.memo
<MemoizedComponent
  style={{ margin: 10 }}
  onClick={() => doSomething()}
/>

// Fixed - stable references
const style = { margin: 10 };
const onClick = useCallback(() => doSomething(), []);
<MemoizedComponent style={style} onClick={onClick} />
```

### Performance anti-patterns to avoid

**Over-optimization** adds complexity without measured benefit. Start with clear, simple code; profile with React DevTools Profiler; optimize only proven bottlenecks:

```javascript
// Anti-pattern - everything memoized unnecessarily
const Component = React.memo(({ text }) => {
  const uppercase = useMemo(() => text.toUpperCase(), [text]);
  const handleClick = useCallback(() => console.log(text), [text]);
  return <div onClick={handleClick}>{uppercase}</div>;
});

// Better - simple and clear (fast enough for most cases)
const Component = ({ text, onClick }) => (
  <div onClick={onClick}>{text.toUpperCase()}</div>
);
```

**Component inside render** is a critical anti-pattern. Defining components inside other components causes complete remounting on every render:

```javascript
// Critical bug - Child remounts every Parent render
function Parent() {
  const Child = () => <div>Child</div>; // New component function!
  return <Child />;
}

// Correct - define outside
const Child = () => <div>Child</div>;
function Parent() {
  return <Child />;
}
```

## Testing converted components thoroughly

Testing validates behavior preservation during conversion. Tests should pass identically for class and functional implementations.

### Test setup for React 18

**React Testing Library v13+** is required for React 18 support. Versions 12 and below are incompatible:

```bash
npm install --save-dev @testing-library/react@latest
npm install --save-dev @testing-library/jest-dom@latest
npm install --save-dev @testing-library/user-event@latest
```

Configure test environment to acknowledge React 18's rendering behavior:

```javascript
// setupTests.js
import '@testing-library/jest-dom';

// Required for React 18 to suppress act() warnings
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
```

**renderHook** for testing custom hooks is now included in @testing-library/react (v13.1+). Remove @testing-library/react-hooks if present:

```bash
npm uninstall @testing-library/react-hooks
```

### Async testing patterns for React 18

React 18's automatic batching and concurrent features require async-aware testing. Use `findBy*` queries and `waitFor` instead of synchronous `getBy*`:

```javascript
// Before (React 17 - synchronous)
test('shows user name', () => {
  render(<UserProfile />);
  const name = getByText('John Doe');
  expect(name).toBeInTheDocument();
});

// After (React 18 - async)
test('shows user name', async () => {
  render(<UserProfile />);
  const name = await findByText('John Doe');
  expect(name).toBeInTheDocument();
});

// Using waitFor for state updates
test('updates count on click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button');

  userEvent.click(button);

  await waitFor(() => {
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

### Testing custom hooks

Test custom hooks using `renderHook` from @testing-library/react:

```javascript
import { renderHook, act } from '@testing-library/react';

function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount(c => c + 1), []);
  return { count, increment };
}

test('increments counter', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// Testing async hooks
test('fetches data', async () => {
  const { result } = renderHook(() => useFetch('/api/data'));

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toEqual(expectedData);
});
```

### Behavior preservation validation

Create parallel tests for class and functional implementations to verify identical behavior:

```javascript
// Snapshot test ensures visual output matches
test('renders same as class component', () => {
  const { container } = render(<FunctionalComponent {...props} />);
  expect(container).toMatchSnapshot();
});

// Interaction test verifies behavior preservation
test('handles click identically', () => {
  const handleClick = jest.fn();
  render(<Component onClick={handleClick} />);

  fireEvent.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
  expect(handleClick).toHaveBeenCalledWith(expectedArgs);
});

// Side effects test confirms API calls match
test('calls API on mount', () => {
  const mockFetch = jest.spyOn(global, 'fetch');
  render(<Component userId="123" />);

  expect(mockFetch).toHaveBeenCalledWith('/api/users/123');
});
```

## Automated migration tooling and commands

React provides codemods and ESLint plugins that automate 50-95% of migration work, depending on code complexity. Always run on version control and review changes before committing.

### Essential codemods for React 18

**react-codemod** handles structural transformations:

```bash
# Update imports (removes unnecessary React imports in JSX files)
npx codemod react/update-react-imports --target src/

# Rename unsafe lifecycle methods (adds UNSAFE_ prefix)
npx codemod react/rename-unsafe-lifecycles --target src/

# Convert PropTypes usage
npx codemod react/React-PropTypes-to-prop-types --target src/

# Convert simple class components to functional (optional)
npx codemod react/pure-component --target src/
```

**types-react-codemod** fixes TypeScript type errors:

```bash
# Run interactive preset for React 18
npx types-react-codemod preset-18 ./src

# Specific transforms
npx types-react-codemod implicit-children ./src  # Adds React.PropsWithChildren
npx types-react-codemod deprecated-react-type ./src  # Updates deprecated types
npx types-react-codemod context-any ./src  # Fixes context typing

# Dry run to preview changes
npx types-react-codemod preset-18 ./src --dry
```

**Example TypeScript fix** - implicit children:

```typescript
// Before (breaks in React 18)
interface Props {
  title: string;
}
const Card: React.FC<Props> = ({ title, children }) => {
  return <div><h2>{title}</h2>{children}</div>;
};

// After (codemod adds PropsWithChildren)
interface Props {
  title: string;
}
const Card: React.FC<React.PropsWithChildren<Props>> = ({ title, children }) => {
  return <div><h2>{title}</h2>{children}</div>;
};
```

### ESLint configuration for hooks

**eslint-plugin-react-hooks** catches 90% of hook bugs automatically. This plugin is non-negotiable:

```bash
npm install --save-dev eslint-plugin-react-hooks
```

Modern ESLint 9+ flat config:

```javascript
// eslint.config.js
import reactHooks from 'eslint-plugin-react-hooks';

export default [{
  plugins: {
    'react-hooks': reactHooks,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}];
```

Legacy .eslintrc configuration:

```json
{
  "extends": ["plugin:react-hooks/recommended"],
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

The `rules-of-hooks` rule enforces calling hooks only at the top level and only in function components. The `exhaustive-deps` rule validates useEffect/useCallback/useMemo dependency arrays.

### Codemod limitations and manual review

**Codemods can automate**:
- Import statement updates
- Type annotation fixes
- API renames (UNSAFE_ prefixes)
- Simple class-to-function conversions
- PropTypes migrations

**Codemods cannot handle**:
- Complex lifecycle method interactions
- Business logic understanding
- State management patterns
- Context-aware refactoring
- Dynamic code patterns
- Aliased imports

**Success rates** range from 80-95% for simple projects to 50-70% for complex codebases. Always review diffs carefully, run tests after each codemod, and expect manual fixes for edge cases.

## Complete implementation plan for AI agents

This structured plan provides step-by-step instructions for executing the migration. Each phase includes validation checkpoints to catch issues early.

### Phase 1: Environment preparation (Week 1)

**Objective**: Upgrade dependencies and establish baseline without changing application code.

```bash
# Step 1: Create migration branch
git checkout -b react-18-migration

# Step 2: Update core React packages
npm install react@latest react-dom@latest

# Step 3: Update TypeScript types (if using TypeScript)
npm install --save-dev @types/react@latest @types/react-dom@latest

# Step 4: Update testing libraries
npm install --save-dev @testing-library/react@latest
npm install --save-dev @testing-library/jest-dom@latest
npm install --save-dev @testing-library/user-event@latest

# Step 5: Remove incompatible packages
npm uninstall @testing-library/react-hooks

# Step 6: Install ESLint plugin for hooks
npm install --save-dev eslint-plugin-react-hooks

# Step 7: Document baseline
npm test -- --coverage > test-results-baseline.txt
npm run build
# Note bundle size from build output
```

**Validation checkpoint 1**:
- [ ] All packages installed without errors
- [ ] Application still compiles (npm run build succeeds)
- [ ] No new TypeScript errors introduced
- [ ] Baseline test results and bundle size documented

### Phase 2: Root API migration (Week 1)

**Objective**: Switch to React 18's createRoot API to enable new features.

Update main entry point:

```javascript
// src/index.js (or index.tsx)

// BEFORE (React 17)
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// AFTER (React 18)
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

If using server-side rendering, update hydration:

```javascript
// BEFORE
import { hydrate } from 'react-dom';
hydrate(<App />, document.getElementById('root'));

// AFTER
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

**Validation checkpoint 2**:
- [ ] Application starts without errors
- [ ] No console warnings about legacy root API
- [ ] Basic functionality works (manual smoke test)
- [ ] Run: `npm test` - all tests pass

### Phase 3: Automated code fixes (Week 2)

**Objective**: Apply codemods to fix deprecated patterns and TypeScript issues.

```bash
# Step 1: Run TypeScript codemods (if using TypeScript)
npx types-react-codemod preset-18 ./src

# Step 2: Review changes
git diff

# Step 3: Fix any remaining TypeScript errors
npx tsc --noEmit > typescript-errors.txt
# Manually fix errors listed in typescript-errors.txt

# Step 4: Rename unsafe lifecycle methods
npx codemod react/rename-unsafe-lifecycles --target src/

# Step 5: Update React imports
npx codemod react/update-react-imports --target src/

# Step 6: Commit changes
git add .
git commit -m "Apply React 18 codemods"
```

**Manual fixes required** after codemods:

1. **Replace UNSAFE_ lifecycle methods** with modern alternatives:

```javascript
// BEFORE
UNSAFE_componentWillMount() {
  this.setState({ data: initialData });
}

// AFTER - move to constructor
constructor(props) {
  super(props);
  this.state = { data: initialData };
}

// BEFORE
UNSAFE_componentWillReceiveProps(nextProps) {
  if (nextProps.userId !== this.props.userId) {
    this.fetchUser(nextProps.userId);
  }
}

// AFTER - use componentDidUpdate
componentDidUpdate(prevProps) {
  if (prevProps.userId !== this.props.userId) {
    this.fetchUser(this.props.userId);
  }
}
```

2. **Replace findDOMNode** with refs:

```javascript
// BEFORE
import ReactDOM from 'react-dom';
const node = ReactDOM.findDOMNode(this);

// AFTER
class MyComponent extends React.Component {
  nodeRef = React.createRef();

  componentDidMount() {
    const node = this.nodeRef.current;
  }

  render() {
    return <div ref={this.nodeRef}>Content</div>;
  }
}
```

3. **Add cleanup to componentWillUnmount**:

```javascript
class DataComponent extends React.Component {
  componentDidMount() {
    this.subscription = DataSource.subscribe(this.handleData);
    window.addEventListener('resize', this.handleResize);
    this.timerId = setInterval(this.checkStatus, 5000);
  }

  componentWillUnmount() {
    // CRITICAL: Clean up all subscriptions
    this.subscription.unsubscribe();
    window.removeEventListener('resize', this.handleResize);
    clearInterval(this.timerId);
  }
}
```

**Validation checkpoint 3**:
- [ ] No UNSAFE_ methods remain (search codebase)
- [ ] No findDOMNode usage (search codebase)
- [ ] All componentDidMount has matching componentWillUnmount cleanup
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`

### Phase 4: Test suite migration (Week 2)

**Objective**: Update tests to work with React 18 APIs and automatic batching.

Update test setup file:

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';

// Required for React 18
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
```

Common test updates needed:

```javascript
// Pattern 1: Change getBy* to findBy* for async operations
// BEFORE
test('shows data', () => {
  render(<DataComponent />);
  expect(getByText('Data loaded')).toBeInTheDocument();
});

// AFTER
test('shows data', async () => {
  render(<DataComponent />);
  expect(await findByText('Data loaded')).toBeInTheDocument();
});

// Pattern 2: Wrap state updates in waitFor
// BEFORE
test('updates count', () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});

// AFTER
test('updates count', async () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => {
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});

// Pattern 3: Update user-event setup
// BEFORE
import userEvent from '@testing-library/user-event';
userEvent.click(button);

// AFTER
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(button);
```

**Validation checkpoint 4**:
- [ ] All tests pass: `npm test`
- [ ] No act() warnings in console
- [ ] Test coverage maintained: `npm test -- --coverage`
- [ ] Compare with baseline coverage

### Phase 5: Incremental component conversion (Weeks 3-4)

**Objective**: Gradually convert class components to functional components with hooks, starting with low-risk components.

**Priority order** for conversion:

1. **Leaf components** (no children, presentational)
2. **Components with simple state** (1-2 state values)
3. **Components with lifecycle methods** (componentDidMount/Update/Unmount)
4. **Components with complex state** (multiple interacting states)
5. **Components with error boundaries** (NEVER convert - no hook equivalent)

**Conversion template** for a typical class component:

```javascript
// BEFORE - Class component
class UserProfile extends React.Component {
  state = {
    user: null,
    loading: true,
    error: null
  };

  componentDidMount() {
    this.fetchUser();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }

  componentWillUnmount() {
    this.abortController.abort();
  }

  fetchUser = async () => {
    this.setState({ loading: true, error: null });
    this.abortController = new AbortController();

    try {
      const response = await fetch(`/api/users/${this.props.userId}`, {
        signal: this.abortController.signal
      });
      const user = await response.json();
      this.setState({ user, loading: false });
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.setState({ error: error.message, loading: false });
      }
    }
  };

  render() {
    const { user, loading, error } = this.state;

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    return <div>{user.name}</div>;
  }
}

// AFTER - Functional component with hooks
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function fetchUser() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users/${userId}`, {
          signal: abortController.signal
        });
        const data = await response.json();

        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user?.name}</div>;
}
```

**Validation after each conversion**:
- [ ] Component renders identically (visual check)
- [ ] All interactions work (click, input, etc.)
- [ ] Tests pass for this component
- [ ] No console warnings
- [ ] ESLint hooks rules pass

**Extract custom hooks** when patterns repeat across components:

```javascript
// Reusable data fetching hook
function useFetch(url) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error.message });
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

// Simplified component using custom hook
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{user?.name}</div>;
}
```

### Phase 6: Final validation and deployment (Week 4)

**Objective**: Comprehensive testing before production deployment.

**Integration testing checklist**:
- [ ] Authentication flow (login/logout)
- [ ] All CRUD operations work
- [ ] Form submissions and validation
- [ ] Navigation and routing
- [ ] Error boundaries catch errors
- [ ] API calls complete successfully
- [ ] WebSocket connections work (if applicable)

**Performance testing**:

```bash
# Compare bundle sizes
npm run build
# Check dist/build output - should be similar or smaller

# Profile with React DevTools
# 1. Install React DevTools browser extension
# 2. Open Profiler tab
# 3. Record interaction session
# 4. Look for unnecessary re-renders
# 5. Verify no performance regressions
```

**Pre-production checklist**:
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Linting passes: `npm run lint`
- [ ] Bundle size acceptable
- [ ] No console errors in dev/prod
- [ ] Manual testing of critical paths complete
- [ ] StrictMode enabled (catches potential issues)
- [ ] Performance profiling shows no regressions

**Deployment strategy**:

```bash
# Step 1: Deploy to staging
git push origin react-18-migration
# Deploy to staging environment

# Step 2: Staging validation (24-48 hours)
# Monitor error logs
# Test all critical workflows
# Verify analytics tracking

# Step 3: Production deployment
git checkout main
git merge react-18-migration
git tag react-18-upgrade-v1.0
git push origin main --tags
# Deploy to production

# Step 4: Post-deployment monitoring
# Watch error tracking (Sentry, Bugsnag, etc.)
# Monitor performance metrics
# Check user reports
```

### Risk mitigation and rollback plan

**Low-risk migration indicators**:
- Well-tested codebase (>70% coverage)
- No UNSAFE_ lifecycle methods
- Proper cleanup in componentWillUnmount
- Active maintenance and modern React patterns

**High-risk migration indicators**:
- Legacy code with deprecated patterns
- Heavy reliance on unmaintained libraries
- Limited test coverage (<50%)
- Many UNSAFE_ methods without clear migration path

**Rollback procedure**:

```bash
# If critical issues found in production

# Step 1: Quick rollback
git revert <merge-commit-hash>
git push origin main
# Redeploy previous version

# Step 2: Investigate issues
# Review error logs
# Reproduce locally
# Identify root cause

# Step 3: Fix and retry
# Create hotfix branch
# Address specific issues
# Test thoroughly
# Redeploy
```

## Critical gotchas and troubleshooting

Five specific scenarios cause most migration issues. Knowing these patterns prevents hours of debugging.

**Issue 1: Automatic batching breaks code that reads DOM between setState calls**

Symptom: Code that worked in React 17 produces incorrect measurements or stale values.

```javascript
// Breaks in React 18 - state updates now batched
handleClick = () => {
  this.setState({ expanded: true });
  const height = this.divRef.current.offsetHeight; // May read old value
  this.setState({ height });
};
```

Solution: Use `flushSync` to force synchronous updates when DOM reading is required.

**Issue 2: StrictMode double-mounting reveals missing cleanup**

Symptom: Subscriptions fire twice, timers run multiple times, API calls duplicate in development.

Cause: StrictMode in React 18 simulates mount-unmount-remount to expose cleanup issues.

Solution: Ensure every side effect in componentDidMount or useEffect has corresponding cleanup in componentWillUnmount or useEffect return function.

**Issue 3: Third-party libraries using deprecated APIs**

Symptom: Console warnings about legacy context, findDOMNode, or deprecated lifecycle methods from node_modules.

Solution: Update all dependencies to latest versions. Check library compatibility before upgrading. For unmaintained libraries, consider alternatives or fork/patch.

**Issue 4: Tests fail with act() warnings after upgrade**

Symptom: Tests that passed in React 17 show "not wrapped in act()" warnings in React 18.

Solution: Update to @testing-library/react v13+, use async queries (findBy*), wrap state updates in waitFor, and add `globalThis.IS_REACT_ACT_ENVIRONMENT = true` to test setup.

**Issue 5: TypeScript children prop errors**

Symptom: TypeScript errors about children prop missing in React 18.

Solution: Run `npx types-react-codemod implicit-children ./src` or manually add `children?: React.ReactNode` to props interfaces.

## Timeline and effort estimation

Migration timeline scales with codebase size and code quality:

**Small apps (dozens of components, well-maintained)**:
- Week 1: Dependency updates and root API migration (4-8 hours)
- Week 2: Automated fixes and test migration (8-12 hours)
- Week 3-4: Optional component conversion to hooks (variable, 1-20 hours)
- **Total: 1-2 weeks calendar time, 13-40 developer hours**

**Small apps (dozens of components, legacy patterns)**:
- Week 1-2: Dependency updates and manual fixes for deprecated patterns (16-24 hours)
- Week 3: Test suite updates and debugging (12-16 hours)
- Week 4: Validation and deployment (8-12 hours)
- **Total: 3-4 weeks calendar time, 36-52 developer hours**

**Effort multipliers**:
- No test coverage: +50% time for manual validation
- Heavy use of UNSAFE_ methods: +100% time for manual refactoring
- TypeScript: +25% time for type fixes (but codemods handle most)
- Unmaintained dependencies: +50-200% time for library updates or replacements

**When to stay on React 17**:
- Internet Explorer support required
- Critical unmaintained dependencies with React 17 hard dependencies
- Experimental React features not yet in React 18
- Severe resource constraints with higher-priority work

## Conclusion

React 18 migration for small apps with class components is low-risk and high-reward. Automatic batching improves performance immediately, concurrent features provide future capabilities, and class components remain fully supported without forced conversion to hooks. The migration path is gradual: upgrade packages, switch root API, fix deprecation warnings, update tests, then optionally convert to hooks incrementally.

Key success factors are enabling `eslint-plugin-react-hooks`, using automated codemods for 50-95% of changes, testing thoroughly at each phase, and starting with low-risk components. The React team designed React 18 for backward compatibility—"thousands of components" tested successfully prove that most applications upgrade smoothly.

For small apps, expect 1-2 weeks for well-maintained code with modern patterns, 3-4 weeks for legacy code requiring manual refactoring. The investment pays dividends in performance, developer experience with hooks, and future-proofing for React's concurrent features. Start today with package updates and root API migration—your app will benefit immediately from automatic batching while you plan optional hook conversions at your own pace.
