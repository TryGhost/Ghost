import { fireEvent, render, screen } from '../../utils/test-utils';
import useSessionStorageState from '../../../src/utils/use-session-storage-state';

interface TestState {
  value: string;
}

const parseTestState = (value: unknown): TestState | null => {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as Partial<TestState>).value === 'string'
  ) {
    return value as TestState;
  }
  return null;
};

function TestComponent() {
  const [state, setState] = useSessionStorageState<TestState>({
    key: 'test-session-state',
    initialState: { value: 'initial' },
    parse: parseTestState,
  });

  return (
    <button type="button" onClick={() => setState((current) => ({ value: `${current.value}!` }))}>
      {state.value}
    </button>
  );
}

describe('useSessionStorageState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('restores parsed state and persists callback updates', () => {
    window.sessionStorage.setItem('test-session-state', JSON.stringify({ value: 'restored' }));
    render(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'restored' }));

    expect(screen.getByRole('button', { name: 'restored!' })).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem('test-session-state') || '')).toEqual({
      value: 'restored!',
    });
  });

  test('falls back when stored state is malformed', () => {
    window.sessionStorage.setItem('test-session-state', '{not json');

    render(<TestComponent />);

    expect(screen.getByRole('button', { name: 'initial' })).toBeInTheDocument();
  });

  test('keeps in-memory state working when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    render(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'initial' }));

    expect(screen.getByRole('button', { name: 'initial!' })).toBeInTheDocument();
  });
});
