import assert from 'assert/strict';
import { useState } from 'react';
import { beforeAll, describe, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PageMenu, PageMenuItem } from '../../../../src/components/ui/pagemenu';
import { render } from '../../utils/test-utils';

const isActive = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('data-state') === 'active';

describe('PageMenu Component', () => {
  it('highlights the item matching value', () => {
    render(
      <PageMenu value="second">
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    assert.equal(isActive('First'), false);
    assert.equal(isActive('Second'), true);
    assert.equal(
      screen.getByRole('button', { name: 'Second' }).getAttribute('aria-current'),
      'page',
    );
  });

  it('keeps a controlled value until the parent changes it', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu value="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    assert.deepEqual(handleValueChange.mock.calls, [['second']]);
    assert.equal(isActive('First'), true);
    assert.equal(isActive('Second'), false);
  });

  it('follows the parent when controlled', () => {
    const TestMenu = () => {
      const [value, setValue] = useState('first');

      return (
        <PageMenu value={value} onValueChange={setValue}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>
      );
    };

    render(<TestMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    assert.equal(isActive('First'), false);
    assert.equal(isActive('Second'), true);
  });

  it('tracks its own selection from defaultValue when uncontrolled', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu defaultValue="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second">Second</PageMenuItem>
      </PageMenu>,
    );

    assert.equal(isActive('First'), true);

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    assert.deepEqual(handleValueChange.mock.calls, [['second']]);
    assert.equal(isActive('First'), false);
    assert.equal(isActive('Second'), true);
  });

  it('does not report a change when the active item is clicked again', () => {
    const handleValueChange = vi.fn();

    render(
      <PageMenu value="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'First' }));

    assert.equal(handleValueChange.mock.calls.length, 0);
  });

  it('runs the item onClick and lets it cancel the selection', () => {
    const handleValueChange = vi.fn();
    const handleClick = vi.fn((event: React.MouseEvent) => event.preventDefault());

    render(
      <PageMenu defaultValue="first" onValueChange={handleValueChange}>
        <PageMenuItem value="first">First</PageMenuItem>
        <PageMenuItem value="second" onClick={handleClick}>
          Second
        </PageMenuItem>
      </PageMenu>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Second' }));

    assert.equal(handleClick.mock.calls.length, 1);
    assert.equal(handleValueChange.mock.calls.length, 0);
    assert.equal(isActive('First'), true);
  });

  describe('when items overflow', () => {
    beforeAll(() => {
      global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    });

    // jsdom measures every element as 0px wide, so a responsive menu moves
    // all of its items into the overflow dropdown.
    const getOverflowTrigger = async () => {
      await waitFor(() =>
        assert.equal(screen.queryAllByRole('button', { hidden: false }).length, 1),
      );
      return screen.getByRole('button');
    };

    const openOverflow = async () => {
      fireEvent.keyDown(await getOverflowTrigger(), { key: 'Enter' });
      return screen.findAllByRole('menuitem');
    };

    it('shows the active hidden item on the trigger and in the dropdown', async () => {
      render(
        <PageMenu value="second" responsive>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      const trigger = await getOverflowTrigger();
      assert.equal(trigger.textContent, 'Second');
      assert.match(trigger.className, /bg-accent/);

      await openOverflow();
      assert.match(screen.getByRole('menuitem', { name: 'Second' }).className, /bg-accent/);
      assert.doesNotMatch(screen.getByRole('menuitem', { name: 'First' }).className, /bg-accent/);
    });

    it('selects a hidden item when uncontrolled', async () => {
      const handleValueChange = vi.fn();

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      assert.deepEqual(handleValueChange.mock.calls, [['second']]);
      assert.equal((await getOverflowTrigger()).textContent, 'Second');
    });

    it('reports a hidden item but keeps a controlled value', async () => {
      const handleValueChange = vi.fn();

      render(
        <PageMenu value="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second">Second</PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      assert.deepEqual(handleValueChange.mock.calls, [['second']]);
      assert.equal((await getOverflowTrigger()).textContent, 'First');
    });

    it('passes the click event to a hidden item and lets it cancel the selection', async () => {
      const handleValueChange = vi.fn();
      const handleClick = vi.fn((event: React.MouseEvent) => event.preventDefault());

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second" onClick={handleClick}>
            Second
          </PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      fireEvent.click(screen.getByRole('menuitem', { name: 'Second' }));

      assert.equal(handleClick.mock.calls.length, 1);
      assert.equal(handleValueChange.mock.calls.length, 0);
    });

    it('does not select a disabled hidden item', async () => {
      const handleValueChange = vi.fn();
      const handleClick = vi.fn();

      render(
        <PageMenu defaultValue="first" responsive onValueChange={handleValueChange}>
          <PageMenuItem value="first">First</PageMenuItem>
          <PageMenuItem value="second" disabled onClick={handleClick}>
            Second
          </PageMenuItem>
        </PageMenu>,
      );

      await openOverflow();
      const item = screen.getByRole('menuitem', { name: 'Second' });
      assert.equal(item.getAttribute('aria-disabled'), 'true');

      fireEvent.click(item);

      assert.equal(handleClick.mock.calls.length, 0);
      assert.equal(handleValueChange.mock.calls.length, 0);
    });
  });
});
