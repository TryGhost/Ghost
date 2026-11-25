import { createRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShadeApp from '../../../src/shade-app';
import { ListItem, ListItemContent } from '../../../src/components/ui/list';
import { RowPrimaryAction, TableRowAction } from '../../../src/components/ui/row-primary-action';
import { TableCell, TableRow } from '../../../src/components/ui/table';

// Exercise real Shade context rather than a mocked flag hook.
const inShade = (flag: boolean, children: React.ReactNode) =>
  render(
    <ShadeApp admin7Design={flag} darkMode={false}>
      {children}
    </ShadeApp>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([false, true])('shared rows with admin7Design=%s', (flag) => {
  it.each([
    ['table', false],
    ['table', true],
    ['list', false],
    ['list', true],
  ] as const)(
    'keeps portaled menu actions outside the %s row (callbacks=%s)',
    (kind, callbacks) => {
      const primary = vi.fn((event: React.MouseEvent) => event.preventDefault());
      const rowClick = vi.fn();
      const rowAux = vi.fn();
      const capture = vi.fn();
      const secondary = vi.fn();
      const secondaryAux = vi.fn();
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      const content = (
        <>
          <RowPrimaryAction asChild>
            <a href="https://example.com/entry" onClick={primary}>
              Entry
            </a>
          </RowPrimaryAction>
          {createPortal(
            <div role="menuitem" onAuxClick={secondaryAux} onClick={secondary}>
              Delete
            </div>,
            document.body,
          )}
        </>
      );
      const rowProps = {
        onClick: callbacks ? rowClick : undefined,
        onAuxClick: callbacks ? rowAux : undefined,
        onClickCapture: capture,
      };
      inShade(
        flag,
        kind === 'table' ? (
          <table>
            <tbody>
              <TableRow {...rowProps}>
                <TableCell>{content}</TableCell>
              </TableRow>
            </tbody>
          </table>
        ) : (
          <ListItem {...rowProps}>{content}</ListItem>
        ),
      );

      const menuItem = screen.getByRole('menuitem');
      fireEvent.click(menuItem);
      fireEvent(
        menuItem,
        new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
      );
      expect(secondary).toHaveBeenCalledOnce();
      expect(secondaryAux).toHaveBeenCalledOnce();
      expect(capture).toHaveBeenCalledOnce();
      expect(rowClick).not.toHaveBeenCalled();
      expect(rowAux).not.toHaveBeenCalled();
      expect(primary).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    },
  );

  it('keeps row callbacks separate from native controls', () => {
    const rowClick = vi.fn();
    const secondary = vi.fn();
    inShade(
      flag,
      <table>
        <tbody>
          <TableRow data-testid="row" onClick={rowClick}>
            <TableCell>Entry</TableCell>
            <TableCell>
              <button type="button" onClick={secondary}>
                Edit
              </button>
            </TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(secondary).toHaveBeenCalledOnce();
    expect(rowClick).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByTestId('row'));
    expect(rowClick).toHaveBeenCalledTimes(1);
  });

  it('delegates blank table space to its primary action', () => {
    const action = vi.fn();
    const secondary = vi.fn();
    inShade(
      flag,
      <table>
        <tbody>
          <TableRow data-testid="row">
            <TableCell>
              <TableRowAction asChild>
                <button type="button" onClick={action}>
                  Open
                </button>
              </TableRowAction>
            </TableCell>
            <TableCell>
              <button type="button" onClick={secondary}>
                More
              </button>
            </TableCell>
          </TableRow>
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId('row'));
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(secondary).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('keeps slotted native markup, refs and caller handlers intact', () => {
    const ref = createRef<HTMLLIElement>();
    const click = vi.fn();
    const pointer = vi.fn();
    inShade(
      flag,
      <ul>
        <ListItem asChild>
          <li ref={ref} data-testid="row" onClick={click} onPointerDown={pointer}>
            Item
          </li>
        </ListItem>
      </ul>,
    );
    expect(ref.current).toBe(screen.getByTestId('row'));
    expect(ref.current?.tagName).toBe('LI');
    fireEvent.click(screen.getByTestId('row'));
    fireEvent.pointerDown(screen.getByTestId('row'));
    expect(click).toHaveBeenCalledOnce();
    expect(pointer).toHaveBeenCalledOnce();
  });

  it.each(['button', 'a'] as const)('activates a slotted root %s from its content', (tag) => {
    const click = vi.fn((event: React.MouseEvent) => event.preventDefault());
    const content = (
      <>
        <span>Setting title</span>
        <span>Setting description</span>
        <svg aria-label="Open setting">
          <path d="m1 1 4 4-4 4" data-testid="chevron" />
        </svg>
      </>
    );
    inShade(
      flag,
      <ListItem asChild>
        {tag === 'button' ? (
          <button type="button" onClick={click}>
            {content}
          </button>
        ) : (
          <a href="/settings" onClick={click}>
            {content}
          </a>
        )}
      </ListItem>,
    );
    fireEvent.click(screen.getByText('Setting title'));
    fireEvent.click(screen.getByText('Setting description'));
    fireEvent.click(screen.getByTestId('chevron'));
    expect(click).toHaveBeenCalledTimes(3);
  });

  it('gives a legacy clickable div keyboard semantics', () => {
    const action = vi.fn();
    inShade(
      flag,
      <ListItem asChild>
        <div>
          <RowPrimaryAction asChild>
            <div onClick={action}>Legacy action</div>
          </RowPrimaryAction>
        </div>
      </ListItem>,
    );
    const control = screen.getByText('Legacy action');
    expect(control.tagName).toBe('DIV');
    expect(control.tabIndex).toBe(0);
    fireEvent.keyDown(control, { key: 'Enter' });
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(control, { key: ' ' });
    expect(action).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(control, { key: ' ' });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('does not invent an action for control-only or disabled rows', () => {
    const disabled = vi.fn();
    const secondary = vi.fn();
    inShade(
      flag,
      <ListItem asChild>
        <div data-testid="row">
          <RowPrimaryAction asChild>
            <button type="button" disabled onClick={disabled}>
              Unavailable
            </button>
          </RowPrimaryAction>
          <button type="button" onClick={secondary}>
            Edit
          </button>
        </div>
      </ListItem>,
    );
    fireEvent.click(screen.getByTestId('row'));
    expect(disabled).not.toHaveBeenCalled();
    expect(secondary).not.toHaveBeenCalled();
  });

  it('keeps capture handlers single-shot while forwarding to the native primary', () => {
    const capture = vi.fn();
    const action = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    inShade(
      flag,
      <ListItem asChild>
        <div data-testid="row" onClickCapture={capture}>
          <RowPrimaryAction asChild>
            <a href="https://example.com/entry" onClick={action}>
              Entry
            </a>
          </RowPrimaryAction>
        </div>
      </ListItem>,
    );
    fireEvent.click(screen.getByTestId('row'), { metaKey: true, shiftKey: true });
    expect(capture).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0][0].metaKey).toBe(true);
    expect(action.mock.calls[0][0].shiftKey).toBe(true);
  });

  it('preserves auxiliary navigation and ignores independent secondary regions', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const secondary = vi.fn();
    const primary = vi.fn((event: React.MouseEvent) => event.preventDefault());
    inShade(
      flag,
      <ListItem asChild>
        <div data-testid="row">
          <RowPrimaryAction asChild>
            <a href="https://example.com/entry" onClick={primary}>
              Entry
            </a>
          </RowPrimaryAction>
          <div data-row-secondary onClick={secondary}>
            Metrics
          </div>
        </div>
      </ListItem>,
    );
    fireEvent.click(screen.getByText('Metrics'));
    expect(secondary).toHaveBeenCalledOnce();
    expect(primary).not.toHaveBeenCalled();
    fireEvent(
      screen.getByTestId('row'),
      new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
    );
    expect(open).toHaveBeenCalledExactlyOnceWith(
      'https://example.com/entry',
      '_blank',
      'noopener,noreferrer',
    );
  });
});

describe.each([false, true])('row review regressions with admin7Design=%s', (flag) => {
  it('keeps checkbox labels independent and ignores secondary markers outside the row', () => {
    const action = vi.fn();
    inShade(
      flag,
      <div data-row-secondary>
        <ListItem data-testid="row">
          <RowPrimaryAction onClick={action}>Open</RowPrimaryAction>
          <label htmlFor="include-entry">Include entry</label>
          <input id="include-entry" type="checkbox" />
          <span>Empty row space</span>
        </ListItem>
      </div>,
    );
    fireEvent.click(screen.getByText('Include entry'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Empty row space'));
    expect(action).toHaveBeenCalledOnce();
  });

  it('keeps a text selection when a drag ends in empty row space', () => {
    const action = vi.fn();
    inShade(
      flag,
      <ListItem data-testid="row">
        <RowPrimaryAction onClick={action}>Open</RowPrimaryAction>
        <span>Selectable text</span>
      </ListItem>,
    );
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(screen.getByText('Selectable text'));
    selection.addRange(range);
    try {
      fireEvent.click(screen.getByTestId('row'));
      expect(action).not.toHaveBeenCalled();
      expect(selection.toString()).toBe('Selectable text');
      selection.collapseToEnd();
      fireEvent.click(screen.getByTestId('row'));
      expect(action).toHaveBeenCalledOnce();
    } finally {
      selection.removeAllRanges();
    }
  });

  it.each([undefined, '/entry', '#entry'])(
    'respects aux-click cancellation and requires a destination (%s)',
    (href) => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      const cancel = vi.fn((event: React.MouseEvent) => event.preventDefault());
      inShade(
        flag,
        <ListItem data-testid="row">
          <RowPrimaryAction asChild>
            <a href={href} onAuxClick={cancel}>
              Entry
            </a>
          </RowPrimaryAction>
        </ListItem>,
      );
      fireEvent(
        screen.getByTestId('row'),
        new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
      );
      expect(open).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledTimes(href === undefined ? 0 : 1);
    },
  );

  it.each([false, true])(
    'handles a wrapper callback and effective aria-disabled (%s)',
    (disabled) => {
      const action = vi.fn();
      inShade(
        flag,
        <RowPrimaryAction aria-disabled={disabled} asChild onClick={action}>
          <div>Run action</div>
        </RowPrimaryAction>,
      );
      const control = screen.getByText('Run action');
      expect(control.tabIndex).toBe(disabled ? -1 : 0);
      fireEvent.keyDown(control, { key: 'Enter' });
      expect(action).toHaveBeenCalledTimes(disabled ? 0 : 1);
      fireEvent.keyDown(control, { key: ' ' });
      expect(action).toHaveBeenCalledTimes(disabled ? 0 : 1);
      fireEvent.keyUp(control, { key: ' ' });
      expect(action).toHaveBeenCalledTimes(disabled ? 0 : 2);
    },
  );

  it('preserves a slotted native callback after capture cancels navigation', () => {
    const click = vi.fn();
    inShade(
      flag,
      <div onClickCapture={(event) => event.preventDefault()}>
        <ListItem asChild>
          <a href="/entry" onClick={click}>
            Entry
          </a>
        </ListItem>
      </div>,
    );
    fireEvent.click(screen.getByText('Entry'));
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.calls[0][0].defaultPrevented).toBe(true);
  });

  it('keeps secondary controls independent when capture cancels the default action', () => {
    const action = vi.fn();
    const secondary = vi.fn();
    inShade(
      flag,
      <div onClickCapture={(event) => event.preventDefault()}>
        <ListItem asChild>
          <div onClick={action}>
            <button type="button" onClick={secondary}>
              Secondary
            </button>
          </div>
        </ListItem>
      </div>,
    );
    fireEvent.click(screen.getByText('Secondary'));
    expect(secondary).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
  });

  it('does not start press feedback from a portaled touch', () => {
    const pointer = vi.fn();
    inShade(
      flag,
      <ListItem data-testid="row" onPointerDown={pointer}>
        <RowPrimaryAction>Open</RowPrimaryAction>
        {createPortal(<span>Portaled item</span>, document.body)}
      </ListItem>,
    );
    const event = new Event('pointerdown', { bubbles: true });
    Object.assign(event, { pointerType: 'touch', pointerId: 1, isPrimary: true });
    fireEvent(screen.getByText('Portaled item'), event);
    expect(pointer).toHaveBeenCalledOnce();
    expect(screen.getByTestId('row').hasAttribute('data-row-pressed')).toBe(false);
  });
});

it('recognizes the native control rendered by a composed router link or submit button', () => {
  const navigate = vi.fn((event: React.MouseEvent) => event.preventDefault());
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const RouterLink = forwardRef<HTMLAnchorElement, { to: string; className?: string }>(
    ({ to, ...props }, ref) => (
      <a {...props} ref={ref} href={to} onClick={navigate}>
        Entry
      </a>
    ),
  );
  const SubmitButton = forwardRef<HTMLButtonElement, { className?: string }>((props, ref) => (
    <button {...props} ref={ref} type="submit">
      Save
    </button>
  ));
  render(
    <form onSubmit={submit}>
      <ListItem data-testid="link-row">
        <ListItemContent asChild>
          <RouterLink to="/entry" />
        </ListItemContent>
      </ListItem>
      <ListItem data-testid="submit-row">
        <ListItemContent asChild>
          <SubmitButton />
        </ListItemContent>
      </ListItem>
    </form>,
  );
  expect(screen.getByRole('link').classList.contains('shade-row-primary')).toBe(true);
  expect(screen.getByRole('button').classList.contains('shade-row-primary')).toBe(true);
  fireEvent.click(screen.getByTestId('link-row'));
  expect(navigate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByTestId('submit-row'));
  expect(submit).toHaveBeenCalledOnce();
});

it('does not invoke a slotted native root for canceled clicks from a portal', () => {
  const action = vi.fn();
  const secondary = vi.fn();
  render(
    <div onClickCapture={(event) => event.preventDefault()}>
      <ListItem asChild>
        <button type="button" onClick={action}>
          Open
          {createPortal(
            <button type="button" onClick={secondary}>
              Portaled secondary
            </button>,
            document.body,
          )}
        </button>
      </ListItem>
    </div>,
  );
  fireEvent.click(screen.getByText('Portaled secondary'));
  expect(secondary).toHaveBeenCalledOnce();
  expect(action).not.toHaveBeenCalled();
});
