import { createRef } from 'react';
import { createPortal } from 'react-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShadeApp from '../../../src/shade-app';
import { ActionListItem } from '../../../src/components/ui/action-list';
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
          <ActionListItem {...rowProps}>{content}</ActionListItem>
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
        <ActionListItem asChild>
          <li ref={ref} data-testid="row" onClick={click} onPointerDown={pointer}>
            Item
          </li>
        </ActionListItem>
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
      <ActionListItem asChild>
        {tag === 'button' ? (
          <button type="button" onClick={click}>
            {content}
          </button>
        ) : (
          <a href="/settings" onClick={click}>
            {content}
          </a>
        )}
      </ActionListItem>,
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
      <ActionListItem asChild>
        <div>
          <RowPrimaryAction asChild>
            <div onClick={action}>Legacy action</div>
          </RowPrimaryAction>
        </div>
      </ActionListItem>,
    );
    const control = screen.getByText('Legacy action');
    expect(control.tagName).toBe('DIV');
    expect(control.tabIndex).toBe(0);
    fireEvent.keyDown(control, { key: 'Enter' });
    fireEvent.keyDown(control, { key: ' ' });
    fireEvent.keyUp(control, { key: ' ' });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('does not invent an action for control-only or disabled rows', () => {
    const disabled = vi.fn();
    const secondary = vi.fn();
    inShade(
      flag,
      <ActionListItem asChild>
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
      </ActionListItem>,
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
      <ActionListItem asChild>
        <div data-testid="row" onClickCapture={capture}>
          <RowPrimaryAction asChild>
            <a href="https://example.com/entry" onClick={action}>
              Entry
            </a>
          </RowPrimaryAction>
        </div>
      </ActionListItem>,
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
    inShade(
      flag,
      <ActionListItem asChild>
        <div data-testid="row">
          <RowPrimaryAction asChild>
            <a href="https://example.com/entry">Entry</a>
          </RowPrimaryAction>
          <div data-row-secondary onClick={secondary}>
            Metrics
          </div>
        </div>
      </ActionListItem>,
    );
    fireEvent.click(screen.getByText('Metrics'));
    expect(secondary).toHaveBeenCalledOnce();
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
